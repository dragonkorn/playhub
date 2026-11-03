import type { PlayerId } from "@playhub/game-contract";

export type Options = Record<string, never>;

export type Move = { type: "drop"; column: number };

/** Row 0 is the bottom row, column 0 the left column (F1). */
export interface Cell {
  row: number;
  column: number;
}

export interface Drop extends Cell {
  player: PlayerId;
}

export interface State {
  phase: "playing" | "finished";
  /** Turn order. Index 0 plays yellow, index 1 plays red. */
  order: PlayerId[];
  current: PlayerId | null;
  drops: Drop[];
  winner: PlayerId | null;
  /** Winning cells, set only on a win by line. */
  line: Cell[] | null;
  /** Players who left the game. */
  out: PlayerId[];
}

/** Nothing is hidden, so every viewer sees the whole state. */
export type View = State;
