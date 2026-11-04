import type { GameMeta } from "@playhub/game-contract";
import type { Role } from "./types";

export const meta: GameMeta = {
  id: "salab-rang",
  minPlayers: 4,
  maxPlayers: 10,
  orientations: ["portrait", "landscape"],
};

/** W7, W8: coins each player starts with, and the most rounds a game lasts. */
export const START_COINS = 5;
export const ROUNDS = 4;

/** W1: coin targets the host can pick. */
export const GOALS = [12, 15, 20] as const;

/** W3: the starter set takes the first N. */
export const STARTER: readonly Role[] = [
  "vendor",
  "seer",
  "pickpocket",
  "police",
  "monk",
  "magician",
  "collector",
  "dog",
  "masseur",
  "taxi",
];

/** W4: the chaos set always holds these, then fills from CHAOS_FILL. */
export const CHAOS_CORE: readonly Role[] = ["medium", "gossip", "taxi", "magician"];
export const CHAOS_FILL: readonly Role[] = ["thug", "police", "pickpocket", "collector", "vendor", "seer"];

/** W20: roles the medium can't channel. */
export const NOT_CHANNELED: readonly Role[] = ["medium", "dog"];
