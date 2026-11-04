import { baiRiang } from "@playhub/game-bai-riang/logic";
import { battleship } from "@playhub/game-battleship/logic";
import { fourInARow } from "@playhub/game-four-in-a-row/logic";
import { salabRang } from "@playhub/game-salab-rang/logic";
import type { Game } from "./room/engine";

export const games: Record<string, Game> = {
  battleship: battleship as unknown as Game,
  "four-in-a-row": fourInARow as unknown as Game,
  "bai-riang": baiRiang as unknown as Game,
  "salab-rang": salabRang as unknown as Game,
};
