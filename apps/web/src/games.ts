import { battleshipUi } from "@playhub/game-battleship/ui";
import type { GameUi } from "@playhub/game-contract";
import type { ComponentType } from "react";

type Base = GameUi<unknown, unknown, unknown>;

/** Games stay free of React types in the contract, so the web app narrows them here. */
export interface WebGame extends Omit<Base, "Board" | "OptionsPanel"> {
  Board: ComponentType<Parameters<Base["Board"]>[0]>;
  OptionsPanel?: ComponentType<Parameters<NonNullable<Base["OptionsPanel"]>>[0]>;
}

export const games: Record<string, WebGame> = {
  battleship: battleshipUi as unknown as WebGame,
};
