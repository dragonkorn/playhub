import type { GameUi } from "@playhub/game-contract";
import { useTranslation } from "react-i18next";
import { meta } from "../logic/meta";
import type { Move, Options, View } from "../logic/types";
import { BoardGrid } from "./BoardGrid";
import { Battle } from "./Battle";
import { Setup } from "./Setup";
import { messages } from "./messages";

type BoardProps = Parameters<GameUi<View, Move, Options>["Board"]>[0];

function Final({ view, players }: Pick<BoardProps, "view" | "players">) {
  const { t } = useTranslation("battleship");
  return (
    <main className="flex h-full flex-col gap-4 overflow-auto p-6">
      <h1 className="font-display text-4xl font-bold">{t("final.title")}</h1>
      <div className="flex flex-wrap gap-5">
        {Object.entries(view.allFleets ?? {}).map(([id, fleet]) => (
          <section key={id} className="flex flex-col gap-1.5">
            <h2 className="truncate text-lg font-bold">{players.find((p) => p.id === id)?.name}</h2>
            <BoardGrid
              cell={18}
              labels={false}
              ships={fleet}
              sunk={view.sunk[id]}
              shots={view.shots.filter((s) => s.target === id)}
            />
          </section>
        ))}
      </div>
    </main>
  );
}

function Board({ view, me, players, send, leave, draft }: BoardProps) {
  if (view.phase === "setup") return <Setup view={view} me={me} players={players} send={send} draft={draft} />;
  if (view.phase === "battle") return <Battle view={view} me={me} players={players} send={send} leave={leave} />;
  return <Final view={view} players={players} />;
}

function OptionsPanel({ options, editable, change }: { options: Options; editable: boolean; change: (o: Options) => void }) {
  const { t } = useTranslation("battleship");
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-bold text-muted">{t("options.title")}</h2>
      <div className="grid grid-cols-2 gap-2">
        {(["free", "robin"] as const).map((targeting) => {
          const on = options.targeting === targeting;
          return (
            <button
              key={targeting}
              type="button"
              disabled={!editable}
              aria-pressed={on}
              onClick={() => change({ targeting })}
              className={`flex h-20 flex-col items-center justify-center rounded-xl border-2 px-2 ${on ? "border-signal bg-signal text-ground" : "border-line bg-panel"}`}
            >
              <span className="text-xl font-bold">{t(`options.${targeting}`)}</span>
              <span className="text-base">{t(`options.${targeting}Hint`)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export const battleshipUi: GameUi<View, Move, Options> = { meta, Board, OptionsPanel, messages };
