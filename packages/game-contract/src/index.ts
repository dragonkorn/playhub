export type PlayerId = string;
export type Device = "ipad" | "phone";
export type Orientation = "landscape" | "portrait";
export type Locale = "th" | "en";

export interface GameMeta {
  id: string;
  minPlayers: number;
  maxPlayers: number;
  device: Device;
  orientation: Orientation;
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

export type MoveResult<State> = { ok: true; state: State } | { ok: false; code: string };

export type Outcome =
  | { done: false }
  /** Best first. Tied players share an inner array. */
  | { done: true; ranking: PlayerId[][] };

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
  }) => unknown;
  OptionsPanel?: (props: {
    options: Options;
    editable: boolean;
    change: (options: Options) => void;
  }) => unknown;
  /** One message catalog per locale, namespaced by game id. */
  messages: Record<Locale, Record<string, string>>;
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
