import type { ClientMessage, PlayerId, RoomPlayer, RoomSnapshot } from "@playhub/game-contract";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { primary, secondary } from "./ui";

/** Spec D4 to D6. Wait stays on this device, because blocking is already the default. */
export function DisconnectPanel({ snapshot, me, send }: { snapshot: RoomSnapshot; me: PlayerId; send: (m: ClientMessage) => void }) {
  const { t } = useTranslation();
  const [waiting, setWaiting] = useState<PlayerId | null>(null);
  const [confirming, setConfirming] = useState(false);

  const blocker: RoomPlayer | undefined = snapshot.players.find(
    (p) => p.connection === "reconnecting" && p.graceExpired && p.status === "seated" && snapshot.activePlayers.includes(p.id),
  );
  if (!blocker) return null;
  const name = blocker.name;
  const isHost = snapshot.hostId === me;

  const markLost = () => {
    send({ type: "markLost", playerId: blocker.id });
    setConfirming(false);
  };

  if (isHost && waiting === blocker.id && !confirming) {
    return (
      <div className="absolute right-6 bottom-6 flex items-center gap-4 rounded-2xl border-2 border-line bg-panel p-3 pl-5">
        <span className="text-lg">{t("disconnect.waiting", { name })}</span>
        <button type="button" onClick={() => setConfirming(true)} className="h-13 rounded-xl border-2 border-hit px-4 text-lg font-bold text-hit">
          {t("disconnect.markLost")}
        </button>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-ground/80">
      <div className="flex w-[520px] flex-col gap-4 rounded-2xl border-2 border-line bg-panel p-8">
        <h2 className="font-display text-4xl font-bold">
          {confirming ? t("disconnect.confirmTitle", { name }) : t("disconnect.title", { name })}
        </h2>
        <p className="text-xl text-muted">
          {confirming
            ? t("disconnect.confirmBody", { name })
            : isHost
              ? t("disconnect.hostBody", { name })
              : t("disconnect.guestBody", { name })}
        </p>
        {isHost && !confirming && (
          <>
            <button type="button" onClick={() => setWaiting(blocker.id)} className={primary}>
              {t("disconnect.wait")}
            </button>
            <button type="button" onClick={() => setConfirming(true)} className={`${secondary} border-hit text-hit`}>
              {t("disconnect.markLost")}
            </button>
          </>
        )}
        {isHost && confirming && (
          <>
            <button type="button" onClick={() => setConfirming(false)} className={secondary}>
              {t("disconnect.keepWaiting")}
            </button>
            <button type="button" onClick={markLost} className="h-20 rounded-2xl bg-hit text-2xl font-bold text-ground">
              {t("disconnect.markLost")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
