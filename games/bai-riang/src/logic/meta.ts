import type { GameMeta } from "@playhub/game-contract";

export const meta: GameMeta = {
  id: "bai-riang",
  minPlayers: 2,
  maxPlayers: 10,
  orientations: ["portrait", "landscape"],
};

/** N2: levels in a game, and the lives the team starts with. */
export const LEVELS = 3;
export const LIVES = 3;

/** N4: topics in the UI catalog, identified by index. */
export const TOPIC_COUNT = 200;
