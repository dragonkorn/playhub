import type { ClientMessage, GameDefinition, RoomSnapshot } from "@playhub/game-contract";
import { CloseCode } from "@playhub/game-contract";
import { seededRandom } from "@playhub/game-contract/testing";
import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryRoomRepository } from "../repositories/in-memory/room-repository";
import { GRACE_MS, RETENTION_MS, RoomEngine, type Outbound } from "./engine";

/** Counter game: active player adds 1 and the turn moves on. First to 3 wins. */
interface TestState {
  order: string[];
  turn: number;
  scores: Record<string, number>;
  out: string[];
}
const testGame: GameDefinition<TestState, { add: number; eliminate?: string }, { mine: number; turn: string }, { limit: number }> = {
  meta: { id: "test", minPlayers: 2, maxPlayers: 10, device: "ipad", orientation: "landscape" },
  defaultOptions: { limit: 3 },
  parseOptions: (raw) => (raw && typeof raw === "object" && "limit" in raw ? (raw as { limit: number }) : null),
  parseMove: (raw) => (raw && typeof raw === "object" && "add" in raw ? (raw as { add: number }) : null),
  setup: ({ players }) => ({
    order: [...players],
    turn: 0,
    scores: Object.fromEntries(players.map((p) => [p, 0])),
    out: [],
  }),
  applyMove(state, player, move) {
    const left = state.order.filter((p) => !state.out.includes(p));
    if (move.add !== 1) return { ok: false, code: "bad_add" };
    return {
      ok: true,
      state: {
        ...state,
        scores: { ...state.scores, [player]: (state.scores[player] ?? 0) + 1 },
        turn: (left.indexOf(player) + 1) % left.length,
        out: move.eliminate ? [...state.out, move.eliminate] : state.out,
      },
    };
  },
  activePlayers(state) {
    const left = state.order.filter((p) => !state.out.includes(p));
    return [left[state.turn % left.length] as string];
  },
  eliminatedPlayers: (state) => state.out,
  removePlayer: (state, player) => ({ ...state, out: [...state.out, player], turn: 0 }),
  outcome(state) {
    const left = state.order.filter((p) => !state.out.includes(p));
    const winner = Object.entries(state.scores).find(([, s]) => s >= 3)?.[0] ?? (left.length === 1 ? left[0] : undefined);
    return winner ? { done: true, ranking: [[winner]] } : { done: false };
  },
  viewFor: (state, viewer) => ({
    mine: viewer ? (state.scores[viewer] ?? 0) : 0,
    turn: state.order[state.turn] as string,
  }),
};

const games = { test: testGame as unknown as GameDefinition<unknown, unknown, unknown, unknown> };

let repo: InMemoryRoomRepository;
let now: number;
let sent: Outbound[];
let tokenCounter: number;

const engine = () =>
  new RoomEngine({
    repository: repo,
    games,
    now: () => now,
    random: seededRandom(1),
    token: () => `token-${++tokenCounter}`,
    id: () => `id-${tokenCounter}`,
  });

async function run<T>(step: (e: RoomEngine) => Promise<T>): Promise<T> {
  const result = step(engine());
  const value = await result;
  return value;
}

const code = "K7Q2";

async function create(name = "Mina") {
  const result = await run((e) => e.create(code, "test", name));
  if (!result.ok) throw new Error(result.code);
  return result;
}

async function join(name: string) {
  const result = await run((e) => e.join(name));
  if (!result.ok) throw new Error(result.code);
  return result;
}

async function connect(token: string) {
  const result = await run((e) => e.connect(token));
  if (!result.ok) throw new Error("refused");
  sent.push(...result.out);
  return result.playerId;
}

async function send(playerId: string, message: ClientMessage) {
  const result = await run((e) => e.message(playerId, message));
  sent.push(...result.out);
  return result;
}

const disconnect = async (playerId: string) => {
  const result = await run((e) => e.disconnect(playerId));
  sent.push(...result.out);
};

const alarm = async () => {
  const result = await run((e) => e.alarm());
  sent.push(...result.out);
  return result;
};

function latest(playerId: string): RoomSnapshot {
  const found = [...sent].reverse().find((o) => o.kind === "send" && o.to === playerId && o.message.type === "snapshot");
  if (found?.kind !== "send" || found.message.type !== "snapshot") throw new Error(`No snapshot for ${playerId}`);
  return found.message.snapshot;
}

const rejectionFor = (playerId: string) => {
  const found = [...sent].reverse().find((o) => o.kind === "send" && o.to === playerId);
  return found?.kind === "send" && found.message.type === "rejected" ? found.message.code : null;
};

/** A room with three connected players, started unless told otherwise. */
async function room(started = true) {
  const host = await create("Mina");
  const arm = await join("Arm");
  const ploy = await join("Ploy");
  for (const t of [host.token, arm.token, ploy.token]) await connect(t);
  if (started) await send(host.playerId, { type: "start" });
  return { host: host.playerId, arm: arm.playerId, ploy: ploy.playerId, tokens: [host.token, arm.token, ploy.token] };
}

const activeIn = (playerId: string) => latest(playerId).activePlayers[0] as string;

beforeEach(() => {
  repo = new InMemoryRoomRepository();
  now = 1_000_000;
  sent = [];
  tokenCounter = 0;
});

describe("rooms", () => {
  it("creates a room with the creator as host (R1)", async () => {
    const { playerId, token } = await create();
    await connect(token);
    expect(latest(playerId).hostId).toBe(playerId);
    expect(latest(playerId).phase).toBe("lobby");
  });

  it("refuses to create over an existing room (R3)", async () => {
    await create();
    expect(await run((e) => e.create(code, "test", "Arm"))).toEqual({ ok: false, code: "room_taken" });
  });

  it("refuses an unknown game", async () => {
    expect(await run((e) => e.create(code, "nope", "Arm"))).toEqual({ ok: false, code: "unknown_game" });
  });

  it("refuses joining a missing room (R5)", async () => {
    expect(await run((e) => e.join("Arm"))).toEqual({ ok: false, code: "room_not_found" });
  });

  it("lets 10 players in and refuses an 11th (R5, R7)", async () => {
    await create("P0");
    for (let i = 1; i < 10; i++) await join(`P${i}`);
    expect(await run((e) => e.join("P10"))).toEqual({ ok: false, code: "room_full" });
  });

  it("refuses joining a started game (R5)", async () => {
    await room();
    expect(await run((e) => e.join("Late"))).toEqual({ ok: false, code: "game_started" });
  });

  it("refuses a duplicate name, ignoring case (R5, R6)", async () => {
    await create("Mina");
    expect(await run((e) => e.join("mina"))).toEqual({ ok: false, code: "name_taken" });
  });

  it("counts graphemes, so Thai marks don't use up the limit (R6)", async () => {
    await create();
    const sixteen = "กำ".repeat(16);
    const seventeen = "กำ".repeat(17);
    expect((await run((e) => e.join(sixteen))).ok).toBe(true);
    expect(await run((e) => e.join(seventeen))).toEqual({ ok: false, code: "name_invalid" });
  });

  it("rejects empty names and control characters, and trims (R6)", async () => {
    await create();
    expect(await run((e) => e.join("   "))).toEqual({ ok: false, code: "name_invalid" });
    expect(await run((e) => e.join("a\u0007b"))).toEqual({ ok: false, code: "name_invalid" });
    const { playerId, token } = await join("  Arm  ");
    await connect(token);
    expect(latest(playerId).players.find((p) => p.id === playerId)?.name).toBe("Arm");
  });

  it("deletes a room 1 hour after last activity (R8)", async () => {
    await create();
    now += RETENTION_MS;
    await alarm();
    expect(await repo.load()).toBeNull();
  });

  it("keeps a room with recent activity (R8)", async () => {
    const { host } = await room();
    now += RETENTION_MS - 1000;
    await send(host, { type: "move", version: latest(host).version, move: { add: 1 } });
    now += 2000;
    await alarm();
    expect(await repo.load()).not.toBeNull();
  });
});

describe("sessions", () => {
  it("never puts a seat token in a snapshot (S3)", async () => {
    const { tokens, host } = await room();
    const json = JSON.stringify(sent);
    for (const token of tokens) expect(json).not.toContain(token);
    expect(latest(host)).toBeDefined();
  });

  it("refuses a bad token", async () => {
    await create();
    expect(await run((e) => e.connect("wrong"))).toEqual({ ok: false });
  });

  it("closes the older socket on a second connection (S4)", async () => {
    const { token, playerId } = await create();
    await connect(token);
    const second = await run((e) => e.connect(token));
    expect(second.ok && second.replaceExisting).toBe(true);
    expect(playerId).toBeDefined();
    expect(CloseCode.replaced).toBe(4003);
  });
});

describe("lobby", () => {
  it("starts only for the host (L1)", async () => {
    const { arm } = await room(false);
    await send(arm, { type: "start" });
    expect(rejectionFor(arm)).toBe("host_only");
  });

  it("needs minPlayers (L1)", async () => {
    const { playerId, token } = await create();
    await connect(token);
    await send(playerId, { type: "start" });
    expect(rejectionFor(playerId)).toBe("not_enough_players");
  });

  it("needs every seat connected (L1)", async () => {
    const { host, arm } = await room(false);
    await disconnect(arm);
    await send(host, { type: "start" });
    expect(rejectionFor(host)).toBe("players_disconnected");
  });

  it("lets only the host change options, and validates them (L2)", async () => {
    const { host, arm } = await room(false);
    await send(arm, { type: "setOptions", options: { limit: 5 } });
    expect(rejectionFor(arm)).toBe("host_only");
    await send(host, { type: "setOptions", options: "nonsense" });
    expect(rejectionFor(host)).toBe("invalid_options");
    await send(host, { type: "setOptions", options: { limit: 5 } });
    expect(latest(arm).options).toEqual({ limit: 5 });
  });

  it("frees a seat when a player leaves the lobby (L4)", async () => {
    const { host, arm } = await room(false);
    await send(arm, { type: "leave" });
    expect(latest(host).players.map((p) => p.id)).not.toContain(arm);
  });

  it("lets the host remove a seat in the lobby (L5)", async () => {
    const { host, arm, ploy } = await room(false);
    await send(arm, { type: "removeSeat", playerId: ploy });
    expect(rejectionFor(arm)).toBe("host_only");
    await send(host, { type: "removeSeat", playerId: ploy });
    expect(latest(host).players.map((p) => p.id)).not.toContain(ploy);
    expect(sent).toContainEqual({ kind: "close", to: ploy, code: CloseCode.removed });
  });
});

describe("turns", () => {
  it("reports active players from the game (T1)", async () => {
    const { host } = await room();
    expect(latest(host).activePlayers).toEqual([host]);
  });

  it("rejects a move from a non-active player (T3)", async () => {
    const { arm } = await room();
    await send(arm, { type: "move", version: latest(arm).version, move: { add: 1 } });
    expect(rejectionFor(arm)).toBe("not_your_turn");
  });

  it("rejects a stale version (P2)", async () => {
    const { host } = await room();
    await send(host, { type: "move", version: latest(host).version - 1, move: { add: 1 } });
    expect(rejectionFor(host)).toBe("stale");
  });

  it("accepts a move sent before an unrelated change (P2)", async () => {
    const { host, ploy } = await room();
    const version = latest(host).version;
    await disconnect(ploy);
    await send(host, { type: "move", version, move: { add: 1 } });
    expect(latest(host).view).toMatchObject({ mine: 1 });
  });

  it("rejects a move queued before the player's current turn began (P2)", async () => {
    const { host, arm, ploy } = await room();
    const old = latest(host).version;
    await send(host, { type: "move", version: old, move: { add: 1 } });
    await send(arm, { type: "move", version: latest(arm).version, move: { add: 1 } });
    await send(ploy, { type: "move", version: latest(ploy).version, move: { add: 1 } });
    expect(activeIn(host)).toBe(host);
    await send(host, { type: "move", version: old, move: { add: 1 } });
    expect(rejectionFor(host)).toBe("stale");
  });

  it("rejects malformed moves and passes on game rejections (P3)", async () => {
    const { host } = await room();
    await send(host, { type: "move", version: latest(host).version, move: "junk" });
    expect(rejectionFor(host)).toBe("invalid_move");
    await send(host, { type: "move", version: latest(host).version, move: { add: 9 } });
    expect(rejectionFor(host)).toBe("bad_add");
  });

  it("rejects malformed client messages (P3)", async () => {
    const { host } = await room();
    await send(host, { type: "explode" } as unknown as ClientMessage);
    expect(rejectionFor(host)).toBe("invalid_message");
  });

  it("increases version on a change, and gives each player their own view (P1)", async () => {
    const { host, arm } = await room();
    const before = latest(host).version;
    await send(host, { type: "move", version: before, move: { add: 1 } });
    expect(latest(host).version).toBeGreaterThan(before);
    expect(latest(host).view).toMatchObject({ mine: 1 });
    expect(latest(arm).view).toMatchObject({ mine: 0 });
  });
});

describe("disconnects", () => {
  it("marks reconnecting immediately, and grace expires only after 30 seconds (D2, D3)", async () => {
    const { host, arm } = await room();
    await disconnect(arm);
    const seat = () => latest(host).players.find((p) => p.id === arm);
    expect(seat()).toMatchObject({ connection: "reconnecting", graceExpired: false });
    now += GRACE_MS - 1;
    await alarm();
    expect(seat()?.graceExpired).toBe(false);
    now += 1;
    await alarm();
    expect(seat()?.graceExpired).toBe(true);
  });

  it("schedules an alarm for the grace period (V2)", async () => {
    const { arm } = await room();
    await disconnect(arm);
    expect(await run((e) => e.nextAlarm())).toBe(now + GRACE_MS);
  });

  it("clears the disconnect on reconnect, with a full snapshot (D2, D3, P1)", async () => {
    const { host, arm, tokens } = await room();
    await disconnect(arm);
    await connect(tokens[1] as string);
    expect(latest(arm).players.find((p) => p.id === arm)).toMatchObject({ connection: "online", graceExpired: false });
    now += GRACE_MS;
    await alarm();
    expect(latest(host).players.find((p) => p.id === arm)?.graceExpired).toBe(false);
  });

  it("blocks on a disconnected active player, and marking lost resumes (T2, D6)", async () => {
    const { host, arm } = await room();
    await send(host, { type: "move", version: latest(host).version, move: { add: 1 } });
    await disconnect(arm);
    now += GRACE_MS;
    await alarm();
    expect(activeIn(host)).toBe(arm);
    await send(host, { type: "markLost", playerId: arm });
    expect(activeIn(host)).not.toBe(arm);
    expect(latest(host).players.find((p) => p.id === arm)?.status).toBe("lost");
  });

  it("rejects marking lost before the grace period ends (D5)", async () => {
    const { host, arm } = await room();
    await disconnect(arm);
    await send(host, { type: "markLost", playerId: arm });
    expect(rejectionFor(host)).toBe("not_disconnected");
  });

  it("rejects markLost from a non-host (D4)", async () => {
    const { arm, ploy } = await room();
    await disconnect(ploy);
    now += GRACE_MS;
    await alarm();
    await send(arm, { type: "markLost", playerId: ploy });
    expect(rejectionFor(arm)).toBe("host_only");
  });

  it("returns a lost player as a watcher whose moves are rejected (D7)", async () => {
    const { host, arm, tokens } = await room();
    await disconnect(arm);
    now += GRACE_MS;
    await alarm();
    await send(host, { type: "markLost", playerId: arm });
    await connect(tokens[1] as string);
    await send(arm, { type: "move", version: latest(arm).version, move: { add: 1 } });
    expect(rejectionFor(arm)).toBe("not_your_turn");
    expect(latest(arm).players.find((p) => p.id === arm)?.status).toBe("lost");
  });

  it("counts leaving during play as lost immediately (L4)", async () => {
    const { host, ploy } = await room();
    await send(ploy, { type: "leave" });
    expect(latest(host).players.find((p) => p.id === ploy)?.status).toBe("lost");
  });

  it("shows game eliminations as a seat status, and keeps sending views (D8)", async () => {
    const { host, ploy } = await room();
    await send(host, { type: "move", version: latest(host).version, move: { add: 1, eliminate: ploy } });
    expect(latest(host).players.find((p) => p.id === ploy)?.status).toBe("eliminated");
    expect(latest(ploy).view).not.toBeNull();
  });
});

describe("host handling", () => {
  it("transfers host after the grace period, in seat order (H2)", async () => {
    const { host, arm, ploy } = await room();
    await disconnect(host);
    expect(latest(arm).hostId).toBe(host);
    now += GRACE_MS;
    await alarm();
    expect(latest(ploy).hostId).toBe(arm);
  });

  it("skips disconnected seats, wrapping around (H2)", async () => {
    const { host, arm, ploy } = await room();
    await disconnect(arm);
    await disconnect(host);
    now += GRACE_MS;
    await alarm();
    expect(latest(ploy).hostId).toBe(ploy);
  });

  it("doesn't give the role back to a returning former host (H4)", async () => {
    const { host, arm, tokens } = await room();
    await disconnect(host);
    now += GRACE_MS;
    await alarm();
    await connect(tokens[0] as string);
    expect(latest(host).hostId).toBe(arm);
  });

  it("gives the role to the first seat back when everyone was offline (H3)", async () => {
    const { host, arm, ploy, tokens } = await room();
    await disconnect(host);
    await disconnect(arm);
    await disconnect(ploy);
    now += GRACE_MS;
    await alarm();
    await connect(tokens[2] as string);
    expect(latest(ploy).hostId).toBe(ploy);
  });

  it("transfers at once when the host leaves (H5)", async () => {
    const { host, arm } = await room();
    await send(host, { type: "leave" });
    expect(latest(arm).hostId).toBe(arm);
  });
});

describe("end of game", () => {
  async function finish() {
    const seats = await room();
    for (let i = 0; i < 9 && latest(seats.host).phase === "playing"; i++) {
      const active = activeIn(seats.host);
      await send(active, { type: "move", version: latest(active).version, move: { add: 1 } });
    }
    return seats;
  }

  it("moves to finished with a ranking", async () => {
    const { host } = await finish();
    expect(latest(host).phase).toBe("finished");
    expect(latest(host).ranking).toEqual([[host]]);
  });

  it("restarts with connected seats and options, dropping others (L3)", async () => {
    const { host, arm, ploy } = await finish();
    await disconnect(ploy);
    await send(arm, { type: "playAgain" });
    expect(rejectionFor(arm)).toBe("host_only");
    await send(host, { type: "playAgain" });
    expect(latest(host).phase).toBe("lobby");
    expect(latest(host).code).toBe(code);
    expect(latest(host).players.map((p) => p.id).sort()).toEqual([host, arm].sort());
    expect(latest(host).view).toBeNull();
  });

  it("removes a finished room's seat on leave (L4)", async () => {
    const { host, ploy } = await finish();
    await send(ploy, { type: "leave" });
    expect(latest(host).players.map((p) => p.id)).not.toContain(ploy);
  });
});

describe("persistence", () => {
  it("gives an identical snapshot from a fresh engine after any step (V3)", async () => {
    const { host, arm } = await room();
    await send(host, { type: "move", version: latest(host).version, move: { add: 1 } });
    const fromRepo = await run((e) => e.snapshotFor(arm));
    expect(fromRepo).toEqual(latest(arm));
  });
});
