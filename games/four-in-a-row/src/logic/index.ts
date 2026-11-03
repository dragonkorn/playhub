import type { GameDefinition, MoveResult, Outcome, PlayerId } from "@playhub/game-contract";
import { COLUMNS, ROWS, heightOf, isFull, linesThrough, onBoard } from "./board";
import { meta } from "./meta";
import type { Drop, Move, Options, State, View } from "./types";

export type { Cell, Drop, Move, Options, View } from "./types";

const otherThan = (state: State, player: PlayerId) => state.order.find((p) => p !== player) ?? null;

function drop(state: State, player: PlayerId, column: number): MoveResult<State> {
  if (state.phase !== "playing") return { ok: false, code: "wrong_phase" };
  if (!onBoard(column)) return { ok: false, code: "off_board" };
  if (isFull(state.drops, column)) return { ok: false, code: "column_full" };

  const placed: Drop = { player, row: heightOf(state.drops, column), column };
  const drops = [...state.drops, placed];
  const line = linesThrough(drops, placed);
  if (line.length > 0) return { ok: true, state: { ...state, drops, phase: "finished", current: null, winner: player, line } };
  if (drops.length === COLUMNS * ROWS) return { ok: true, state: { ...state, drops, phase: "finished", current: null } };
  return { ok: true, state: { ...state, drops, current: otherThan(state, player) } };
}

export const fourInARow: GameDefinition<State, Move, View, Options> = {
  meta,
  defaultOptions: {},

  parseOptions(raw) {
    return typeof raw === "object" && raw !== null ? {} : null;
  },

  parseMove(raw) {
    if (typeof raw !== "object" || raw === null) return null;
    const { type, column } = raw as Record<string, unknown>;
    return type === "drop" && Number.isInteger(column) ? { type, column: column as number } : null;
  },

  setup({ players, random }) {
    const order = random() < 0.5 ? [...players] : [...players].reverse();
    return { phase: "playing", order, current: order[0] ?? null, drops: [], winner: null, line: null, out: [] };
  },

  applyMove(state, player, move) {
    return drop(state, player, move.column);
  },

  activePlayers(state) {
    return state.current ? [state.current] : [];
  },

  eliminatedPlayers(state) {
    return state.out;
  },

  removePlayer(state, player) {
    if (state.phase !== "playing") return state;
    return { ...state, phase: "finished", current: null, winner: otherThan(state, player), out: [player] };
  },

  outcome(state): Outcome {
    if (state.phase !== "finished") return { done: false };
    if (!state.winner) return { done: true, ranking: [[...state.order]] };
    const loser = otherThan(state, state.winner);
    return { done: true, ranking: loser ? [[state.winner], [loser]] : [[state.winner]] };
  },

  viewFor(state) {
    return state;
  },
};
