import type { RoomPlayer } from "@playhub/game-contract";
import { useTranslation } from "react-i18next";

export function ConnectionDot({ player }: { player: RoomPlayer }) {
  const { t } = useTranslation();
  const lost = player.status === "lost";
  const state = lost ? "lost" : player.connection;
  const style = lost ? "border-hit bg-hit" : player.connection === "online" ? "border-online bg-online" : "border-signal bg-transparent";
  return <span role="img" aria-label={t(`status.${state}`)} className={`h-3 w-3 flex-none rounded-full border-2 ${style}`} />;
}
