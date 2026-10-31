import type { PlayerId } from "@playhub/game-contract";

export type ShipId = "carrier" | "battleship" | "cruiser" | "submarine" | "destroyer";
export type ShipOrientation = "horizontal" | "vertical";

export interface Placement {
  ship: ShipId;
  row: number;
  col: number;
  orientation: ShipOrientation;
}

export interface Cell {
  row: number;
  col: number;
}

export interface Options {
  targeting: "free" | "robin";
}

export type Move =
  | { type: "ready"; fleet: Placement[] }
  | { type: "fire"; target: PlayerId; row: number; col: number };

export interface Shot {
  shooter: PlayerId;
  target: PlayerId;
  row: number;
  col: number;
  result: "miss" | "hit" | "sunk";
  /** Only when sunk. */
  ship?: ShipId;
}

export interface State {
  phase: "setup" | "battle" | "finished";
  options: Options;
  fleets: Record<PlayerId, Placement[] | null>;
  turnOrder: PlayerId[];
  current: PlayerId | null;
  shots: Shot[];
  /** Players out of the game, in the order they left it. */
  out: PlayerId[];
}

export interface View {
  phase: State["phase"];
  targeting: Options["targeting"];
  ready: PlayerId[];
  turnOrder: PlayerId[];
  current: PlayerId | null;
  /** Null unless the viewer may shoot. Set in robin mode. */
  forcedTarget: PlayerId | null;
  shots: Shot[];
  myFleet: Placement[] | null;
  sunk: Record<PlayerId, Placement[]>;
  shipsLeft: Record<PlayerId, number>;
  out: PlayerId[];
  /** Null until the game ends. */
  allFleets: Record<PlayerId, Placement[]> | null;
}
