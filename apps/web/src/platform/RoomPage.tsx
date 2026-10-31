import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { games } from "../games";
import { sessions } from "../repositories/session-repository";
import { DisconnectPanel } from "./DisconnectPanel";
import { LobbyPage } from "./LobbyPage";
import { ResultPage } from "./ResultPage";
import { navigate } from "./router";
import { useRoom } from "./use-room";
import { secondary } from "./ui";

export function RoomPage({ code }: { code: string }) {
  const { t } = useTranslation();
  const session = useMemo(() => sessions.session(code), [code]);
  const { snapshot, online, ended, rejection, send } = useRoom(code, session?.token ?? null);
  const [toast, setToast] = useState<string | null>(null);
  const [boards, setBoards] = useState(false);

  useEffect(() => {
    if (!session) navigate(`/join/${code}`);
  }, [session, code]);

  useEffect(() => {
    if (!rejection) return;
    setToast(rejection.code);
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [rejection]);

  const phase = snapshot?.phase;
  useEffect(() => setBoards(false), [phase]);

  const goHome = useCallback(() => {
    sessions.removeSession(code);
    navigate("/");
  }, [code]);

  const leave = useCallback(() => {
    send({ type: "leave" });
    goHome();
  }, [send, goHome]);

  const draft = useMemo(
    () => ({ load: () => sessions.draft(code), save: (value: unknown) => sessions.saveDraft(code, value) }),
    [code],
  );

  if (ended) {
    return (
      <main className="flex h-full flex-col items-center justify-center gap-6">
        <h1 className="font-display text-5xl font-bold">{t("connection.ended")}</h1>
        <button type="button" onClick={goHome} className={`${secondary} w-72`}>
          {t("result.games")}
        </button>
      </main>
    );
  }

  if (!snapshot || !session) {
    return <main className="flex h-full items-center justify-center text-2xl text-muted">{t("connection.lost")}</main>;
  }

  const me = session.playerId;
  const game = games[snapshot.gameId];
  const Board = game?.Board;
  const message = (code: string) =>
    t(`error.${code}`, { ns: snapshot.gameId, defaultValue: t(`error.${code}`, { defaultValue: t("error.generic") }) });

  return (
    <>
      {snapshot.phase === "lobby" && <LobbyPage snapshot={snapshot} me={me} send={send} leave={leave} />}
      {snapshot.phase === "finished" && !boards && (
        <ResultPage snapshot={snapshot} me={me} send={send} leave={leave} showBoards={() => setBoards(true)} />
      )}
      {(snapshot.phase === "playing" || boards) && Board && snapshot.view != null && (
        <Board
          view={snapshot.view}
          me={me}
          players={snapshot.players}
          send={(move: unknown) => send({ type: "move", version: snapshot.version, move })}
          leave={leave}
          draft={draft}
        />
      )}
      {boards && (
        <button type="button" onClick={() => setBoards(false)} className={`${secondary} absolute top-6 right-6 h-14 px-6`}>
          {t("result.backToResult")}
        </button>
      )}
      {snapshot.phase === "playing" && <DisconnectPanel snapshot={snapshot} me={me} send={send} />}
      {!online && (
        <div className="absolute inset-x-0 top-0 bg-signal py-1 text-center text-lg font-bold text-ground">{t("connection.lost")}</div>
      )}
      {toast && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-xl bg-hit px-6 py-3 text-xl font-bold text-ground">
          {message(toast)}
        </div>
      )}
    </>
  );
}
