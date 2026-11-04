import type { PlayerId } from "@playhub/game-contract";

export const ROLES = [
  "vendor",
  "pickpocket",
  "police",
  "seer",
  "monk",
  "magician",
  "collector",
  "medium",
  "gossip",
  "thug",
  "masseur",
  "taxi",
  "dog",
] as const;

export type Role = (typeof ROLES)[number];

export type CardSet = "starter" | "chaos" | "random" | "custom";

export type Options = {
  goal: 12 | 15 | 20;
  set: CardSet;
  /** Used only with `custom`. */
  roles: Role[];
};

export type Power =
  | { role: "vendor"; customer: PlayerId }
  | { role: "pickpocket" | "police" | "monk" | "gossip" | "thug" | "masseur"; target: PlayerId }
  | { role: "seer"; targets: [PlayerId, PlayerId] }
  | { role: "magician" | "collector" }
  | { role: "taxi"; from: PlayerId; to: PlayerId }
  | { role: "medium"; as: Power };

export type Move =
  | { type: "hide" }
  | { type: "swap"; target: PlayerId; real: boolean }
  | { type: "peek" }
  | { type: "claim"; role: Role }
  | { type: "respond"; challenge: boolean }
  | { type: "continue" }
  | { type: "power"; power: Power }
  | { type: "done" };

export type Phase =
  | "memorize"
  | "turn"
  | "peek"
  | "challenge"
  | "reveal"
  | "power"
  | "secret"
  | "shown"
  | "massage"
  | "finished";

/** Public history. Never holds a swap's outcome or a private look's result. */
export type Event =
  | { kind: "swap"; player: PlayerId; target: PlayerId }
  | { kind: "peek"; player: PlayerId }
  | { kind: "claim"; player: PlayerId; role: Role; challengers: PlayerId[] }
  | { kind: "reveal"; cards: { player: PlayerId; role: Role; owner: boolean }[] }
  | {
      kind: "power";
      player: PlayerId;
      role: Role;
      as?: Role;
      targets: PlayerId[];
      caught?: boolean;
      found?: boolean;
      skipped?: boolean;
    }
  | { kind: "gossip"; target: PlayerId; role: Role }
  | { kind: "coins"; changes: Record<PlayerId, number> };

export type EndReason = "goal" | "rounds" | "players";

export interface State {
  phase: Phase;
  options: Options;
  /** Every player who started, in seat order. */
  started: PlayerId[];
  /** Players still in the game, in turn order. */
  players: PlayerId[];
  out: PlayerId[];
  /** Characters dealt this game, in catalog order. */
  deck: Role[];
  cards: Record<PlayerId, Role>;
  coins: Record<PlayerId, number>;
  hidden: PlayerId[];
  round: number;
  current: PlayerId;
  claim: { player: PlayerId; role: Role } | null;
  answers: Record<PlayerId, boolean>;
  /** Who acts in reveal, power, secret, shown and massage. */
  actor: PlayerId | null;
  /** Cards the actor may see in `secret`. */
  looked: PlayerId[];
  /** Claimants whose cards are face up in `reveal`. */
  revealed: PlayerId[];
  /** Blessed player to the players who blessed them. */
  blessings: Record<PlayerId, PlayerId[]>;
  /** Players the thug has muted for their next turn. */
  muted: PlayerId[];
  /** The current player, when muted for this turn. */
  silenced: PlayerId | null;
  log: Event[];
  reason: EndReason | null;
}

export interface View {
  phase: Phase;
  goal: number;
  round: number;
  rounds: number;
  order: PlayerId[];
  deck: Role[];
  coins: Record<PlayerId, number>;
  current: PlayerId | null;
  actor: PlayerId | null;
  claim: { player: PlayerId; role: Role } | null;
  /** Who has answered the current challenge. */
  answered: PlayerId[];
  /** The viewer's own answer, if any. */
  myAnswer: boolean | null;
  hidden: PlayerId[];
  blessed: PlayerId[];
  muted: PlayerId[];
  /** Exactly the cards this viewer may see right now. */
  cards: Record<PlayerId, Role>;
  log: Event[];
  reason: EndReason | null;
}
