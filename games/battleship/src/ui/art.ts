import type { ShipId } from "../logic/types";
import battleship from "./assets/battleship.svg";
import battleshipSunk from "./assets/battleship-sunk.svg";
import carrier from "./assets/carrier.svg";
import carrierSunk from "./assets/carrier-sunk.svg";
import cruiser from "./assets/cruiser.svg";
import cruiserSunk from "./assets/cruiser-sunk.svg";
import destroyer from "./assets/destroyer.svg";
import destroyerSunk from "./assets/destroyer-sunk.svg";
import submarine from "./assets/submarine.svg";
import submarineSunk from "./assets/submarine-sunk.svg";

export const shipArt: Record<ShipId, { intact: string; sunk: string }> = {
  carrier: { intact: carrier, sunk: carrierSunk },
  battleship: { intact: battleship, sunk: battleshipSunk },
  cruiser: { intact: cruiser, sunk: cruiserSunk },
  submarine: { intact: submarine, sunk: submarineSunk },
  destroyer: { intact: destroyer, sunk: destroyerSunk },
};
