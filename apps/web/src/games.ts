import { baiRiangUi } from "@playhub/game-bai-riang/ui";
import { battleshipUi } from "@playhub/game-battleship/ui";
import { fourInARow } from "@playhub/game-four-in-a-row/logic";
import { fourInARowUi } from "@playhub/game-four-in-a-row/ui";
import type { GameDefinition, GameUi } from "@playhub/game-contract";
import type { ComponentType } from "react";

type Base = GameUi<unknown, unknown, unknown>;

/** Games stay free of React types in the contract, so the web app narrows them here. */
export interface WebGame extends Omit<Base, "Board" | "OptionsPanel"> {
  Board: ComponentType<Parameters<Base["Board"]>[0]>;
  OptionsPanel?: ComponentType<Parameters<NonNullable<Base["OptionsPanel"]>>[0]>;
}

export const games: Record<string, WebGame> = {
  battleship: battleshipUi as unknown as WebGame,
  "four-in-a-row": fourInARowUi as unknown as WebGame,
  "bai-riang": baiRiangUi as unknown as WebGame,
};

/** Rules for local-play games only, which run on this device (O3, ADR-0006). */
export const localGames: Record<string, GameDefinition<unknown, unknown, unknown, unknown>> = {
  "four-in-a-row": fourInARow as unknown as GameDefinition<unknown, unknown, unknown, unknown>,
};
