import type { ClientMessage, PlayerId, RoomPlayer, RoomSnapshot } from "@playhub/game-contract";
import { Button, Dialog } from "@playhub/ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";

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

  if (confirming) {
    return (
      <Dialog title={t("disconnect.confirmTitle", { name })} body={t("disconnect.confirmBody", { name })}>
        <Button variant="secondary" size="lg" onClick={() => setConfirming(false)}>
          {t("disconnect.keepWaiting")}
        </Button>
        <Button variant="danger" onClick={markLost}>
          {t("disconnect.markLost")}
        </Button>
      </Dialog>
    );
  }

  if (isHost && waiting === blocker.id) {
    return (
      <div className="absolute right-6 bottom-6 flex items-center gap-4 rounded-2xl border-2 border-line bg-panel p-3 pl-5">
        <span className="text-lg">{t("disconnect.waiting", { name })}</span>
        <Button variant="dangerOutline" size="sm" onClick={() => setConfirming(true)}>
          {t("disconnect.markLost")}
        </Button>
      </div>
    );
  }

  return (
    <Dialog title={t("disconnect.title", { name })} body={isHost ? t("disconnect.hostBody", { name }) : t("disconnect.guestBody", { name })}>
      {isHost && (
        <>
          <Button onClick={() => setWaiting(blocker.id)}>{t("disconnect.wait")}</Button>
          <Button variant="dangerOutline" size="lg" onClick={() => setConfirming(true)}>
            {t("disconnect.markLost")}
          </Button>
        </>
      )}
    </Dialog>
  );
}
