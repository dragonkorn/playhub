import type { GameUi } from "@playhub/game-contract";
import { meta } from "../logic/meta";
import type { Move, Options, View } from "../logic/types";
import "./fx.css";
import { messages } from "./messages";
import { PlayPage } from "./pages/PlayPage";

type BoardProps = Parameters<GameUi<View, Move, Options>["Board"]>[0];

function Board({ view, me, players, send, preferences, online, holding, release, local }: BoardProps) {
  return (
    <PlayPage
      view={view}
      me={me}
      players={players}
      send={send}
      preferences={preferences}
      online={online}
      holding={holding}
      release={release}
      local={local}
    />
  );
}

export const fourInARowUi: GameUi<View, Move, Options> = { meta, Board, messages, holdsFinish: true };
