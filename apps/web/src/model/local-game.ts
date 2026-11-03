import { normalizeName, type GameDefinition, type PlayerId, type RoomSnapshot } from "@playhub/game-contract";

type Game = GameDefinition<unknown, unknown, unknown, unknown>;

/** Stands in for the host and viewer on the result screen, so this device can play again (O7). */
export const LOCAL_HOST = "local";

export interface LocalRecord {
  gameId: string;
  names: string[];
  state: unknown;
  version: number;
}

const seatId = (index: number): PlayerId => `local-${index + 1}`;

/** Spec O2: one valid name per seat, all different. */
export function checkNames(game: Game, raw: readonly string[]): { ok: true; names: string[] } | { ok: false; code: string } {
  if (raw.length < game.meta.minPlayers || raw.length > game.meta.maxPlayers) return { ok: false, code: "not_enough_players" };
  const names = raw.map(normalizeName);
  if (names.some((name) => name === null)) return { ok: false, code: "name_invalid" };
  const folded = names.map((name) => (name as string).toLocaleLowerCase());
  if (new Set(folded).size !== folded.length) return { ok: false, code: "name_taken" };
  return { ok: true, names: names as string[] };
}

export function startLocal(game: Game, gameId: string, names: readonly string[], random: () => number, version = 0): LocalRecord {
  const players = names.map((_, i) => seatId(i));
  return { gameId, names: [...names], state: game.setup({ players, options: game.defaultOptions, random }), version };
}

/** Plays a move as the active seat (O4). */
export function moveLocal(game: Game, record: LocalRecord, raw: unknown, random: () => number): { ok: true; record: LocalRecord } | { ok: false; code: string } {
  if (game.outcome(record.state).done) return { ok: false, code: "wrong_phase" };
  const player = game.activePlayers(record.state)[0];
  if (player === undefined) return { ok: false, code: "wrong_phase" };
  const move = game.parseMove(raw);
  if (move === null) return { ok: false, code: "invalid_move" };
  const result = game.applyMove(record.state, player, move, random);
  if (!result.ok) return { ok: false, code: result.code };
  return { ok: true, record: { ...record, state: result.state, version: record.version + 1 } };
}

export const playAgainLocal = (game: Game, record: LocalRecord, random: () => number) =>
  startLocal(game, record.gameId, record.names, random, record.version + 1);

/** The same snapshot shape as online play, so the result screen is shared (O7). */
export function snapshotOf(game: Game, record: LocalRecord): RoomSnapshot {
  const outcome = game.outcome(record.state);
  const active = outcome.done ? [] : game.activePlayers(record.state);
  const eliminated = game.eliminatedPlayers(record.state);
  return {
    version: record.version,
    code: "",
    gameId: record.gameId,
    phase: outcome.done ? "finished" : "playing",
    hostId: LOCAL_HOST,
    players: record.names.map((name, i) => ({
      id: seatId(i),
      name,
      connection: "online",
      status: eliminated.includes(seatId(i)) ? "eliminated" : "seated",
      graceExpired: false,
    })),
    options: game.defaultOptions,
    activePlayers: active,
    view: game.viewFor(record.state, active[0] ?? null),
    ranking: outcome.done ? outcome.ranking : null,
    team: outcome.done ? (outcome.team ?? null) : null,
  };
}

/** Browser randomness for local games, which the game's pure logic receives as `random` (O3). */
export const deviceRandom = () => (crypto.getRandomValues(new Uint32Array(1))[0] ?? 0) / 2 ** 32;
