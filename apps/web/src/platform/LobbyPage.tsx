import type { ClientMessage, PlayerId, RoomSnapshot } from "@playhub/game-contract";
import { useTranslation } from "react-i18next";
import QRCode from "react-qr-code";
import { games } from "../games";
import { ConnectionDot } from "./ConnectionDot";
import { primary } from "./ui";

interface Props {
  snapshot: RoomSnapshot;
  me: PlayerId;
  send: (message: ClientMessage) => void;
  leave: () => void;
}

export function LobbyPage({ snapshot, me, send, leave }: Props) {
  const { t } = useTranslation();
  const game = games[snapshot.gameId];
  const isHost = snapshot.hostId === me;
  const Options = game?.OptionsPanel;
  const joinUrl = `${location.origin}/join/${snapshot.code}`;

  return (
    <main className="flex h-full flex-col gap-6 px-14 pt-8 pb-10">
      <header className="flex items-center justify-between gap-6">
        <h1 className="font-display text-5xl font-bold">{t("lobby.title", { game: t("name", { ns: snapshot.gameId }) })}</h1>
        <button type="button" onClick={leave} className="flex min-h-11 items-center text-xl font-medium text-muted">
          {t("common.leave")}
        </button>
      </header>
      <div className="grid min-h-0 grow grid-cols-2 gap-10">
        <section className="flex flex-col items-center justify-center gap-5 rounded-2xl bg-panel p-8">
          <h2 className="text-lg font-bold text-muted">{t("lobby.code")}</h2>
          <p className="font-display text-9xl leading-none font-extrabold tracking-[0.1em]">{snapshot.code}</p>
          <div className="rounded-xl bg-white p-3.5">
            <QRCode value={joinUrl} size={210} />
          </div>
          <p className="text-lg text-muted">{t("lobby.scan")}</p>
        </section>
        <section className="flex min-h-0 flex-col gap-3">
          <h2 className="text-lg font-bold text-muted">
            {t("lobby.players", { count: snapshot.players.length, max: game?.meta.maxPlayers })}
          </h2>
          <ul className="grid grid-cols-2 gap-2">
            {snapshot.players.map((player) => (
              <li key={player.id} className="flex h-13 items-center gap-2.5 rounded-xl bg-panel px-3.5 text-xl font-medium">
                <ConnectionDot player={player} />
                <span className="grow truncate">{player.name}</span>
                <span className="text-base text-muted">
                  {player.id === snapshot.hostId ? t("lobby.host") : player.id === me ? t("lobby.you") : ""}
                </span>
                {isHost && player.id !== me && (
                  <button
                    type="button"
                    aria-label={t("lobby.remove", { name: player.name })}
                    onClick={() => send({ type: "removeSeat", playerId: player.id })}
                    className="-mr-2 flex h-11 w-11 flex-none items-center justify-center text-2xl text-muted"
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
          {Options && (
            <Options options={snapshot.options} editable={isHost} change={(options: unknown) => send({ type: "setOptions", options })} />
          )}
          {isHost ? (
            <button type="button" onClick={() => send({ type: "start" })} className={`${primary} mt-auto`}>
              {t("lobby.start")}
            </button>
          ) : (
            <p className="mt-auto flex h-20 items-center justify-center rounded-2xl border-2 border-dashed border-line text-xl text-muted">
              {t("lobby.waitHost")}
            </p>
          )}
          <p className="text-center text-base text-muted">{t("lobby.hostHint")}</p>
        </section>
      </div>
    </main>
  );
}
