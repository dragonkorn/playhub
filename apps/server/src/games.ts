import { battleship } from "@playhub/game-battleship/logic";
import type { Game } from "./room/engine";

export const games: Record<string, Game> = {
  battleship: battleship as unknown as Game,
};
