import { Button, NoticeBar, Toast } from "@playhub/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { games } from "../games";
import { navigate } from "../model/router";
import { useRoom } from "../model/use-room";
import { DisconnectPanel } from "../organisms/DisconnectPanel";
import { sessions } from "../repositories/session-repository";
import { LobbyPage } from "./LobbyPage";
import { ResultPage } from "./ResultPage";

export function RoomPage({ code }: { code: string }) {
  const { t } = useTranslation();
  const session = useMemo(() => sessions.session(code), [code]);
  const { snapshot, online, ended, rejection, send } = useRoom(code, session?.token ?? null);
  const [toast, setToast] = useState<string | null>(null);
  const [boards, setBoards] = useState(false);
  const [released, setReleased] = useState(false);
  const release = useCallback(() => setReleased(true), []);

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
  useEffect(() => {
    setBoards(false);
    setReleased(false);
  }, [phase]);

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
  const preferences = useMemo(() => ({ load: sessions.preference, save: sessions.savePreference }), []);

  if (ended) {
    return (
      <main className="flex h-full flex-col items-center justify-center gap-6">
        <h1 className="font-display text-5xl font-bold">{t("connection.ended")}</h1>
        <Button variant="secondary" size="lg" onClick={goHome} className="w-72">
          {t("result.games")}
        </Button>
      </main>
    );
  }

  if (!snapshot || !session) {
    return <main className="flex h-full items-center justify-center text-2xl text-muted">{t("connection.lost")}</main>;
  }

  const me = session.playerId;
  const game = games[snapshot.gameId];
  const Board = game?.Board;
  const holding = snapshot.phase === "finished" && Boolean(game?.holdsFinish) && !released;
  const message = (error: string) =>
    t(`error.${error}`, { ns: snapshot.gameId, defaultValue: t(`error.${error}`, { defaultValue: t("error.generic") }) });

  return (
    <>
      {snapshot.phase === "lobby" && <LobbyPage snapshot={snapshot} me={me} send={send} leave={leave} />}
      {snapshot.phase === "finished" && !boards && !holding && (
        <ResultPage snapshot={snapshot} me={me} send={send} leave={leave} showBoards={() => setBoards(true)} />
      )}
      {(snapshot.phase === "playing" || boards || holding) && Board && snapshot.view != null && (
        <Board
          view={snapshot.view}
          me={me}
          players={snapshot.players}
          send={(move: unknown) => send({ type: "move", version: snapshot.version, move })}
          leave={leave}
          draft={draft}
          preferences={preferences}
          online={online}
          holding={holding}
          release={release}
          local={false}
        />
      )}
      {boards && (
        <Button variant="secondary" size="sm" onClick={() => setBoards(false)} className="absolute top-6 right-6">
          {t("result.backToResult")}
        </Button>
      )}
      {snapshot.phase === "playing" && <DisconnectPanel snapshot={snapshot} me={me} send={send} />}
      {!online && <NoticeBar>{t("connection.lost")}</NoticeBar>}
      {toast && <Toast>{message(toast)}</Toast>}
    </>
  );
}
