export type PlayerId = string;
export type Orientation = "landscape" | "portrait";
export type Locale = "th" | "en";

export interface GameMeta {
  id: string;
  minPlayers: number;
  maxPlayers: number;
  /** Orientations the game screen lays out for, preferred first (C5, ADR-0007). */
  orientations: readonly Orientation[];
  /** Can be played by everyone on one device (O1). */
  localPlay?: boolean;
}

/** Translatable text. The client renders it, the server never sends sentences. */
export interface Message {
  code: string;
  params?: Record<string, string | number>;
}

export interface GameContext<Options> {
  players: readonly PlayerId[];
  options: Options;
  /** Injected so tests are deterministic. Games must not call Math.random. */
  random: () => number;
}

export type Team = "won" | "lost";

export type MoveResult<State> = { ok: true; state: State } | { ok: false; code: string };

export type Outcome =
  | { done: false }
  /** Best first. Tied players share an inner array. A cooperative game also sets `team` (L8). */
  | { done: true; ranking: PlayerId[][]; team?: Team };

export interface GameDefinition<State, Move, View, Options> {
  meta: GameMeta;
  defaultOptions: Options;
  /** Both parsers take untrusted client input. Return null when invalid. */
  parseOptions(raw: unknown): Options | null;
  parseMove(raw: unknown): Move | null;

  setup(ctx: GameContext<Options>): State;
  applyMove(state: State, player: PlayerId, move: Move, random: () => number): MoveResult<State>;
  activePlayers(state: State): PlayerId[];
  eliminatedPlayers(state: State): PlayerId[];
  /** Applies a platform removal: lost or left. Must keep the game able to finish. */
  removePlayer(state: State, player: PlayerId, random: () => number): State;
  outcome(state: State): Outcome;
  /** viewer is null for a watcher with no seat in the game. */
  viewFor(state: State, viewer: PlayerId | null): View;
}

export type ConnectionStatus = "online" | "reconnecting";
export type SeatStatus = "seated" | "eliminated" | "lost" | "watching";

export interface RoomPlayer {
  id: PlayerId;
  name: string;
  connection: ConnectionStatus;
  status: SeatStatus;
  graceExpired: boolean;
}

export interface GameUi<View, Move, Options> {
  meta: GameMeta;
  Board: (props: {
    view: View;
    me: PlayerId;
    players: readonly RoomPlayer[];
    send: (move: Move) => void;
    leave: () => void;
    /** Device storage for this player's unsent work in this room. */
    draft: { load(): unknown; save(value: unknown): void };
    /** Per-device settings that outlive a room. */
    preferences: { load(name: string): unknown; save(name: string, value: unknown): void };
    /** False while this device's own connection is down. */
    online: boolean;
    /** True when the game ended and the platform is waiting for `release`. */
    holding: boolean;
    release: () => void;
    /** True when every seat plays on this device, and `me` is the active seat (O4). */
    local: boolean;
  }) => unknown;
  OptionsPanel?: (props: {
    options: Options;
    editable: boolean;
    change: (options: Options) => void;
  }) => unknown;
  /** One message catalog per locale, namespaced by game id. */
  messages: Record<Locale, Record<string, string>>;
  /** Keep showing the board after the game ends, until it calls `release`. */
  holdsFinish?: boolean;
  /** The result line from the final view, as a code in the game's catalog (L9). */
  resultLine?: (view: View) => Message;
}

export type RoomPhase = "lobby" | "playing" | "finished";

export interface RoomSnapshot {
  version: number;
  code: string;
  gameId: string;
  phase: RoomPhase;
  hostId: PlayerId;
  players: RoomPlayer[];
  options: unknown;
  activePlayers: PlayerId[];
  view: unknown | null;
  ranking: PlayerId[][] | null;
  /** Set for a cooperative outcome (L8). */
  team: Team | null;
}

export type ClientMessage =
  | { type: "start" }
  | { type: "setOptions"; options: unknown }
  | { type: "move"; version: number; move: unknown }
  | { type: "markLost"; playerId: PlayerId }
  | { type: "removeSeat"; playerId: PlayerId }
  | { type: "playAgain" }
  | { type: "leave" };

export type ServerMessage =
  | { type: "snapshot"; snapshot: RoomSnapshot }
  | { type: "rejected"; code: string };

/** Terminal WebSocket close codes. The client does not retry these. */
export const CloseCode = {
  roomClosed: 4001,
  removed: 4002,
  replaced: 4003,
} as const;

export const MAX_NAME_GRAPHEMES = 16;

/** Spec R6: NFC, trimmed, 1 to 16 grapheme clusters, no control characters. Null when invalid. */
export function normalizeName(raw: unknown): string | null {
  if (typeof raw !== "string" || /\p{Cc}/u.test(raw)) return null;
  const name = raw.normalize("NFC").trim();
  const graphemes = [...new Intl.Segmenter("th", { granularity: "grapheme" }).segment(name)].length;
  return graphemes >= 1 && graphemes <= MAX_NAME_GRAPHEMES ? name : null;
}
