import type {
  ClientMessage,
  GameDefinition,
  PlayerId,
  RoomSnapshot,
  ServerMessage,
} from "@playhub/game-contract";
import { CloseCode, normalizeName } from "@playhub/game-contract";
import type { RoomRecord, RoomRepository, Seat } from "../repositories/room-repository";

export const GRACE_MS = 30_000;
export const RETENTION_MS = 60 * 60 * 1000;

export type Game = GameDefinition<unknown, unknown, unknown, unknown>;

export type Outbound =
  | { kind: "send"; to: PlayerId; message: ServerMessage }
  | { kind: "close"; to: PlayerId; code: number };

export interface EngineDeps {
  repository: RoomRepository;
  games: Record<string, Game>;
  now: () => number;
  random: () => number;
  token: () => string;
  id: () => string;
}

type Admission = { ok: true; playerId: PlayerId; token: string } | { ok: false; code: string };
type Connection = { ok: false } | { ok: true; playerId: PlayerId; replaceExisting: boolean; out: Outbound[] };
interface Result {
  out: Outbound[];
}

class Rejected extends Error {}

const reject = (code: string): never => {
  throw new Rejected(code);
};

/** Room rules with no Cloudflare APIs. The Durable Object shell delivers `out`. */
export class RoomEngine {
  constructor(private readonly deps: EngineDeps) {}

  async create(code: string, gameId: string, rawName: unknown): Promise<Admission> {
    if (await this.deps.repository.load()) return { ok: false, code: "room_taken" };
    const game = this.deps.games[gameId];
    if (!game) return { ok: false, code: "unknown_game" };
    const name = normalizeName(rawName);
    if (!name) return { ok: false, code: "name_invalid" };

    const seat = this.newSeat(name);
    await this.persist({
      code,
      gameId,
      phase: "lobby",
      hostId: seat.id,
      version: 1,
      options: game.defaultOptions,
      seats: [seat],
      gameState: null,
      ranking: null,
      lastActivity: this.deps.now(),
    });
    return { ok: true, playerId: seat.id, token: seat.token };
  }

  async join(rawName: unknown): Promise<Admission> {
    const record = await this.deps.repository.load();
    if (!record) return { ok: false, code: "room_not_found" };
    if (record.phase !== "lobby") return { ok: false, code: "game_started" };
    if (record.seats.length >= this.gameOf(record).meta.maxPlayers) return { ok: false, code: "room_full" };

    const name = normalizeName(rawName);
    if (!name) return { ok: false, code: "name_invalid" };
    const taken = record.seats.some((s) => s.name.toLowerCase() === name.toLowerCase());
    if (taken) return { ok: false, code: "name_taken" };

    const seat = this.newSeat(name);
    record.seats.push(seat);
    await this.commit(record);
    return { ok: true, playerId: seat.id, token: seat.token };
  }

  async connect(token: string): Promise<Connection> {
    const record = await this.deps.repository.load();
    const seat = record?.seats.find((s) => s.token === token);
    if (!record || !seat) return { ok: false };

    const replaceExisting = seat.connection === "online";
    seat.connection = "online";
    seat.disconnectedAt = null;
    seat.graceExpired = false;

    const host = record.seats.find((s) => s.id === record.hostId);
    if (!host || (host.connection !== "online" && host.graceExpired)) record.hostId = seat.id;

    const out = await this.commit(record);
    return { ok: true, playerId: seat.id, replaceExisting, out };
  }

  async disconnect(playerId: PlayerId): Promise<Result> {
    const record = await this.deps.repository.load();
    const seat = record?.seats.find((s) => s.id === playerId);
    if (!record || !seat) return { out: [] };
    this.markOffline(seat);
    return { out: await this.commit(record) };
  }

  async message(playerId: PlayerId, message: ClientMessage): Promise<Result> {
    const record = await this.deps.repository.load();
    if (!record) return { out: [] };
    try {
      const closes: Outbound[] = [];
      this.apply(record, playerId, message, closes);
      if (record.seats.length === 0) {
        await this.deps.repository.delete();
        return { out: closes };
      }
      return { out: [...(await this.commit(record)), ...closes] };
    } catch (error) {
      if (!(error instanceof Rejected)) throw error;
      return { out: [{ kind: "send", to: playerId, message: { type: "rejected", code: error.message } }] };
    }
  }

  async alarm(): Promise<Result> {
    const record = await this.deps.repository.load();
    if (!record) return { out: [] };
    const now = this.deps.now();

    if (now >= record.lastActivity + RETENTION_MS) {
      await this.deps.repository.delete();
      return {
        out: record.seats
          .filter((s) => s.connection === "online")
          .map((s) => ({ kind: "close", to: s.id, code: CloseCode.roomClosed })),
      };
    }

    const expired = record.seats.filter(
      (s) => s.disconnectedAt !== null && !s.graceExpired && now >= s.disconnectedAt + GRACE_MS,
    );
    if (expired.length === 0) return { out: [] };
    for (const seat of expired) seat.graceExpired = true;
    if (expired.some((s) => s.id === record.hostId)) this.transferHost(record);

    record.version += 1;
    await this.persist(record);
    return { out: this.broadcast(record) };
  }

  async nextAlarm(): Promise<number | null> {
    const record = await this.deps.repository.load();
    if (!record) return null;
    const pending = record.seats.flatMap((s) =>
      s.disconnectedAt !== null && !s.graceExpired ? [s.disconnectedAt + GRACE_MS] : [],
    );
    return Math.min(record.lastActivity + RETENTION_MS, ...pending);
  }

  async snapshotFor(playerId: PlayerId): Promise<RoomSnapshot | null> {
    const record = await this.deps.repository.load();
    return record ? this.snapshot(record, playerId) : null;
  }

  private apply(record: RoomRecord, playerId: PlayerId, message: ClientMessage, closes: Outbound[]) {
    const seat = record.seats.find((s) => s.id === playerId) ?? reject("not_seated");
    const hostOnly = () => {
      if (record.hostId !== playerId) reject("host_only");
    };
    const inPhase = (phase: RoomRecord["phase"]) => {
      if (record.phase !== phase) reject("wrong_phase");
    };

    switch (message?.type) {
      case "start":
        hostOnly();
        inPhase("lobby");
        return this.start(record);
      case "setOptions": {
        hostOnly();
        inPhase("lobby");
        record.options = this.gameOf(record).parseOptions(message.options) ?? reject("invalid_options");
        return;
      }
      case "move":
        return this.move(record, seat, message);
      case "markLost": {
        hostOnly();
        inPhase("playing");
        const target = record.seats.find((s) => s.id === message.playerId);
        if (!target || target.connection === "online" || !target.graceExpired) reject("not_disconnected");
        return this.markLost(record, target as Seat);
      }
      case "removeSeat": {
        hostOnly();
        inPhase("lobby");
        if (message.playerId === playerId || !record.seats.some((s) => s.id === message.playerId)) {
          reject("invalid_target");
        }
        record.seats = record.seats.filter((s) => s.id !== message.playerId);
        closes.push({ kind: "close", to: message.playerId, code: CloseCode.removed });
        return;
      }
      case "playAgain":
        hostOnly();
        inPhase("finished");
        return this.playAgain(record, closes);
      case "leave":
        return this.leave(record, seat, closes);
      default:
        reject("invalid_message");
    }
  }

  private start(record: RoomRecord) {
    const { meta } = this.gameOf(record);
    if (record.seats.length < meta.minPlayers) reject("not_enough_players");
    if (record.seats.some((s) => s.connection !== "online")) reject("players_disconnected");

    record.gameState = this.gameOf(record).setup({
      players: record.seats.map((s) => s.id),
      options: record.options,
      random: this.deps.random,
    });
    record.phase = "playing";
    this.syncGame(record, []);
  }

  private move(record: RoomRecord, seat: Seat, message: Extract<ClientMessage, { type: "move" }>) {
    if (record.phase !== "playing") reject("wrong_phase");
    if (typeof message.version !== "number") reject("invalid_message");

    const game = this.gameOf(record);
    if (!game.activePlayers(record.gameState).includes(seat.id)) reject("not_your_turn");
    if (message.version < seat.activeSince) reject("stale");

    const move = game.parseMove(message.move) ?? reject("invalid_move");
    const active = game.activePlayers(record.gameState);
    const result = game.applyMove(record.gameState, seat.id, move, this.deps.random);
    if (!result.ok) return reject(result.code);
    record.gameState = result.state;
    this.syncGame(record, active);
  }

  private markLost(record: RoomRecord, seat: Seat) {
    seat.status = "lost";
    const game = this.gameOf(record);
    const active = game.activePlayers(record.gameState);
    record.gameState = game.removePlayer(record.gameState, seat.id, this.deps.random);
    this.syncGame(record, active);
  }

  private leave(record: RoomRecord, seat: Seat, closes: Outbound[]) {
    closes.push({ kind: "close", to: seat.id, code: CloseCode.removed });
    if (record.phase === "playing") {
      this.markOffline(seat);
      seat.graceExpired = true;
      if (seat.status === "seated") this.markLost(record, seat);
    }
    if (record.hostId === seat.id) this.transferHost(record);
    if (record.phase !== "playing") record.seats = record.seats.filter((s) => s !== seat);
  }

  private playAgain(record: RoomRecord, closes: Outbound[]) {
    const keep = (s: Seat) => s.connection === "online" && s.status !== "lost";
    for (const seat of record.seats) {
      if (!keep(seat) && seat.connection === "online") {
        closes.push({ kind: "close", to: seat.id, code: CloseCode.removed });
      }
    }
    record.seats = record.seats.filter(keep);
    for (const seat of record.seats) seat.status = "seated";
    record.phase = "lobby";
    record.gameState = null;
    record.ranking = null;
  }

  /** Copies eliminations, newly active players and the finish from the game into the room. */
  private syncGame(record: RoomRecord, activeBefore: PlayerId[]) {
    const game = this.gameOf(record);
    const eliminated = game.eliminatedPlayers(record.gameState);
    const active = game.activePlayers(record.gameState);
    for (const seat of record.seats) {
      if (seat.status === "seated" && eliminated.includes(seat.id)) seat.status = "eliminated";
      if (active.includes(seat.id) && !activeBefore.includes(seat.id)) seat.activeSince = record.version + 1;
    }
    const outcome = game.outcome(record.gameState);
    if (outcome.done) {
      record.phase = "finished";
      record.ranking = outcome.ranking;
    }
  }

  /** H2: next connected seat after the old host, wrapping around. */
  private transferHost(record: RoomRecord) {
    const seats = record.seats;
    const from = seats.findIndex((s) => s.id === record.hostId);
    for (let i = 1; i <= seats.length; i++) {
      const candidate = seats[(from + i) % seats.length] as Seat;
      if (candidate.id !== record.hostId && candidate.connection === "online") {
        record.hostId = candidate.id;
        return;
      }
    }
  }

  private markOffline(seat: Seat) {
    seat.connection = "reconnecting";
    seat.disconnectedAt = this.deps.now();
    seat.graceExpired = false;
  }

  private newSeat(name: string): Seat {
    const token = this.deps.token();
    return {
      id: this.deps.id(),
      name,
      token,
      connection: "reconnecting",
      status: "seated",
      disconnectedAt: this.deps.now(),
      graceExpired: false,
      activeSince: 0,
    };
  }

  private gameOf(record: RoomRecord): Game {
    const game = this.deps.games[record.gameId];
    if (!game) throw new Error(`Unknown game ${record.gameId}`);
    return game;
  }

  private async persist(record: RoomRecord) {
    await this.deps.repository.save(record);
  }

  private async commit(record: RoomRecord): Promise<Outbound[]> {
    record.version += 1;
    record.lastActivity = this.deps.now();
    await this.persist(record);
    return this.broadcast(record);
  }

  private broadcast(record: RoomRecord): Outbound[] {
    return record.seats
      .filter((s) => s.connection === "online")
      .map((s) => ({
        kind: "send",
        to: s.id,
        message: { type: "snapshot", snapshot: this.snapshot(record, s.id) },
      }));
  }

  private snapshot(record: RoomRecord, viewer: PlayerId): RoomSnapshot {
    const game = this.gameOf(record);
    const playing = record.gameState !== null;
    return {
      version: record.version,
      code: record.code,
      gameId: record.gameId,
      phase: record.phase,
      hostId: record.hostId,
      players: record.seats.map(({ id, name, connection, status, graceExpired }) => ({
        id,
        name,
        connection,
        status,
        graceExpired,
      })),
      options: record.options,
      activePlayers: playing ? game.activePlayers(record.gameState) : [],
      view: playing ? game.viewFor(record.gameState, viewer) : null,
      ranking: record.ranking,
    };
  }
}
