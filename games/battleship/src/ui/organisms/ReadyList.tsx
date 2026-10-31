import type { PlayerId, RoomPlayer } from "@playhub/game-contract";
import { PlayerRow, SectionLabel } from "@playhub/ui";
import { useTranslation } from "react-i18next";

export function ReadyList({ players, ready }: { players: readonly RoomPlayer[]; ready: readonly PlayerId[] }) {
  const { t } = useTranslation("battleship");
  return (
    <>
      <SectionLabel>{t("setup.players")}</SectionLabel>
      <div className="flex flex-col gap-1.5">
        {players
          .filter((p) => p.status !== "lost")
          .map((p) => (
            <PlayerRow key={p.id} size="sm" name={p.name} trailing={ready.includes(p.id) ? t("setup.ready") : t("setup.placing")} />
          ))}
      </div>
    </>
  );
}
