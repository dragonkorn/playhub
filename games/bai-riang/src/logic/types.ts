import type { PlayerId } from "@playhub/game-contract";

export type Options = { topics: "random" | "agreed" };

export type Move =
  | { type: "play"; card: number }
  | { type: "next"; level: number }
  | { type: "reroll"; level: number };

export interface Card {
  player: PlayerId;
  card: number;
}

/** One reveal, with the lower numbers it skipped (N7). */
export interface Reveal extends Card {
  skipped: Card[];
}

export interface State {
  phase: "playing" | "cleared" | "finished";
  options: Options;
  /** Players still in the game, in seat order. */
  players: PlayerId[];
  /** Every player who started, for the ranking. */
  started: PlayerId[];
  level: number;
  lives: number;
  /** Topic index, or null with `agreed`. */
  topic: number | null;
  used: number[];
  /** Numbers dealt this level, ascending, including revealed ones. */
  dealt: Record<PlayerId, number[]>;
  /** This level's reveals, in order. */
  reveals: Reveal[];
  out: PlayerId[];
  won: boolean | null;
}

export interface View {
  phase: State["phase"];
  topics: Options["topics"];
  level: number;
  lives: number;
  topic: number | null;
  /** The viewer's own numbers this level, ascending. Empty for a watcher. */
  mine: number[];
  /** Unrevealed count per player. */
  left: Record<PlayerId, number>;
  reveals: Reveal[];
  won: boolean | null;
}
