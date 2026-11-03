import type { GameUi } from "@playhub/game-contract";
import { meta } from "../logic/meta";
import type { Move, Options, View } from "../logic/types";
import "./fx.css";
import { messages } from "./messages";
import { TopicOptions } from "./organisms/TopicOptions";
import { PlayPage } from "./pages/PlayPage";

type BoardProps = Parameters<GameUi<View, Move, Options>["Board"]>[0];

function Board({ view, me, players, send, preferences, online, holding, release }: BoardProps) {
  return <PlayPage view={view} me={me} players={players} send={send} preferences={preferences} online={online} holding={holding} release={release} />;
}

export const baiRiangUi: GameUi<View, Move, Options> = {
  meta,
  Board,
  OptionsPanel: TopicOptions,
  messages,
  holdsFinish: true,
  // L9, N20: the line above the team result.
  resultLine: (view) => (view.won ? { code: "result.won" } : { code: "result.lost", params: { level: view.level } }),
};
