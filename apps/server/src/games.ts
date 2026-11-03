import { battleship } from "@playhub/game-battleship/logic";
import { fourInARow } from "@playhub/game-four-in-a-row/logic";
import type { Game } from "./room/engine";

export const games: Record<string, Game> = {
  battleship: battleship as unknown as Game,
  "four-in-a-row": fourInARow as unknown as Game,
};
