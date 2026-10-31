import type { PlayerId, RoomPlayer } from "@playhub/game-contract";
import { PlayerRow } from "@playhub/ui";
import { useTranslation } from "react-i18next";

export interface PlayerGridProps {
  players: readonly RoomPlayer[];
  hostId: PlayerId;
  me: PlayerId;
  /** Set for the host, who can remove seats. */
  onRemove?: (id: PlayerId) => void;
}

export function PlayerGrid({ players, hostId, me, onRemove }: PlayerGridProps) {
  const { t } = useTranslation();
  return (
    <ul className="grid grid-cols-2 gap-2">
      {players.map((player) => {
        const status = player.status === "lost" ? "lost" : player.connection;
        return (
          <li key={player.id}>
            <PlayerRow
              name={player.name}
              dot={{ status, label: t(`status.${status}`) }}
              trailing={player.id === hostId ? t("lobby.host") : player.id === me ? t("lobby.you") : undefined}
              action={
                onRemove &&
                player.id !== me && (
                  <button
                    type="button"
                    aria-label={t("lobby.remove", { name: player.name })}
                    onClick={() => onRemove(player.id)}
                    className="-mr-2 flex h-11 w-11 flex-none items-center justify-center text-2xl text-muted"
                  >
                    ×
                  </button>
                )
              }
            />
          </li>
        );
      })}
    </ul>
  );
}
