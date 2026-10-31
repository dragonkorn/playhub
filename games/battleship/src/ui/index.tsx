import type { GameUi } from "@playhub/game-contract";
import { meta } from "../logic/meta";
import type { Move, Options, View } from "../logic/types";
import "./fx.css";
import { messages } from "./messages";
import { OptionsPanel } from "./organisms/OptionsPanel";
import { BattlePage } from "./pages/BattlePage";
import { FinalBoardsPage } from "./pages/FinalBoardsPage";
import { SetupPage } from "./pages/SetupPage";

type BoardProps = Parameters<GameUi<View, Move, Options>["Board"]>[0];

function Board({ view, me, players, send, leave, draft, preferences, online, holding, release }: BoardProps) {
  if (view.phase === "setup") return <SetupPage view={view} me={me} players={players} send={send} draft={draft} />;
  if (view.phase === "battle" || holding) {
    return (
      <BattlePage
        view={view}
        me={me}
        players={players}
        send={send}
        leave={leave}
        preferences={preferences}
        online={online}
        holding={holding}
        release={release}
      />
    );
  }
  return <FinalBoardsPage view={view} players={players} />;
}

export const battleshipUi: GameUi<View, Move, Options> = { meta, Board, OptionsPanel, messages, holdsFinish: true };
