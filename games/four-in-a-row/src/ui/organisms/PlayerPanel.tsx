import type { PlayerId, RoomPlayer } from "@playhub/game-contract";
import { PlayerRow, SectionLabel } from "@playhub/ui";
import { useTranslation } from "react-i18next";
import { Disc, type DiscColor } from "../atoms/Disc";

export interface PlayerPanelRow {
  id: PlayerId;
  name: string;
  player: RoomPlayer | undefined;
  color: DiscColor;
  highlighted: boolean;
}

export function PlayerPanel({ rows }: { rows: PlayerPanelRow[] }) {
  const { t } = useTranslation("four-in-a-row");
  return (
    <>
      <SectionLabel>{t("players.title")}</SectionLabel>
      {rows.map((row) => {
        const status = row.player?.status === "lost" ? "lost" : (row.player?.connection ?? "online");
        return (
          <PlayerRow
            key={row.id}
            size="lg"
            name={row.name}
            dot={{ status, label: t(`status.${status}`) }}
            trailing={<Disc color={row.color} size={28} label={t(`color.${row.color}`)} />}
            highlighted={row.highlighted}
            dimmed={row.player?.status === "lost"}
          />
        );
      })}
    </>
  );
}
