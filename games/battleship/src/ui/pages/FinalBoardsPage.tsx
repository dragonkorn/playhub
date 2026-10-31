import type { RoomPlayer } from "@playhub/game-contract";
import { useTranslation } from "react-i18next";
import type { View } from "../../logic/types";
import { BoardGrid } from "../organisms/BoardGrid";

export function FinalBoardsPage({ view, players }: { view: View; players: readonly RoomPlayer[] }) {
  const { t } = useTranslation("battleship");
  return (
    <main className="flex h-full flex-col gap-4 overflow-auto p-6">
      <h1 className="font-display text-4xl font-bold">{t("final.title")}</h1>
      <div className="flex flex-wrap gap-5">
        {Object.entries(view.allFleets ?? {}).map(([id, fleet]) => (
          <section key={id} className="flex flex-col gap-1.5">
            <h2 className="truncate text-lg font-bold">{players.find((p) => p.id === id)?.name}</h2>
            <BoardGrid cell={18} labels={false} ships={fleet} sunk={view.sunk[id]} shots={view.shots.filter((s) => s.target === id)} />
          </section>
        ))}
      </div>
    </main>
  );
}
