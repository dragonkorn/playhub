import type { GameUi } from "@playhub/game-contract";
import { meta } from "../logic/meta";
import type { Move, Options, View } from "../logic/types";
import "./fx.css";
import { messages } from "./messages";
import { SetOptions } from "./organisms/SetOptions";
import { PlayPage } from "./pages/PlayPage";

type BoardProps = Parameters<GameUi<View, Move, Options>["Board"]>[0];

function Board({ view, me, players, send, online }: BoardProps) {
  return <PlayPage view={view} me={me} players={players} send={send} online={online} />;
}

export const salabRangUi: GameUi<View, Move, Options> = {
  meta,
  Board,
  OptionsPanel: SetOptions,
  messages,
  // L9, W26: why the market closed.
  resultLine: (view) => ({ code: `result.${view.reason ?? "rounds"}` }),
};
