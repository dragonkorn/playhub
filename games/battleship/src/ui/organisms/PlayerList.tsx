import type { PlayerId, RoomPlayer } from "@playhub/game-contract";
import { PlayerRow, SectionLabel } from "@playhub/ui";
import { useTranslation } from "react-i18next";

export interface PlayerListRow {
  id: PlayerId;
  name: string;
  player: RoomPlayer | undefined;
  shipsLeft: number;
  out: boolean;
  selected: boolean;
  highlighted: boolean;
  disabled: boolean;
}

export function PlayerList({ title, rows, onPick }: { title: string; rows: PlayerListRow[]; onPick: (id: PlayerId) => void }) {
  const { t } = useTranslation("battleship");
  return (
    <>
      <SectionLabel>{title}</SectionLabel>
      {rows.map((row) => {
        const status = row.player?.status === "lost" ? "lost" : (row.player?.connection ?? "online");
        return (
          <PlayerRow
            key={row.id}
            size="lg"
            name={row.name}
            dot={{ status, label: t(`status.${status}`) }}
            trailing={row.out ? t("battle.out") : t("battle.of", { count: row.shipsLeft })}
            selected={row.selected}
            highlighted={row.highlighted}
            dimmed={row.out}
            disabled={row.disabled}
            onClick={() => onPick(row.id)}
          />
        );
      })}
    </>
  );
}
