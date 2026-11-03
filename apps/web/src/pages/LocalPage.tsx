import type { ClientMessage } from "@playhub/game-contract";
import { Button, Field, FormLayout, TextInput, Toast } from "@playhub/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { games, localGames } from "../games";
import { LOCAL_HOST, checkNames, deviceRandom, moveLocal, playAgainLocal, snapshotOf, startLocal, type LocalRecord } from "../model/local-game";
import { navigate } from "../model/router";
import { sessions } from "../repositories/session-repository";
import { ResultPage } from "./ResultPage";

/** Spec O2 to O7: a whole game on this device, with no room and no network. */
export function LocalPage({ gameId }: { gameId: string }) {
  const { t } = useTranslation();
  const game = localGames[gameId];
  const ui = games[gameId];
  const [record, setRecord] = useState<LocalRecord | null>(() => {
    const saved = sessions.localGame() as LocalRecord | null;
    return saved?.gameId === gameId ? saved : null;
  });
  const seats = game?.meta.minPlayers ?? 0;
  const [names, setNames] = useState<string[]>(() => Array.from({ length: seats }, () => ""));
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [boards, setBoards] = useState(false);
  const [released, setReleased] = useState(false);
  const release = useCallback(() => setReleased(true), []);

  const save = (next: LocalRecord | null) => {
    sessions.saveLocalGame(next);
    setRecord(next);
  };

  const snapshot = useMemo(() => (game && record ? snapshotOf(game, record) : null), [game, record]);
  const phase = snapshot?.phase;
  useEffect(() => {
    setBoards(false);
    setReleased(false);
  }, [phase]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const draft = useMemo(() => ({ load: () => null, save: () => {} }), []);
  const preferences = useMemo(() => ({ load: sessions.preference, save: sessions.savePreference }), []);

  const leave = useCallback(() => {
    sessions.saveLocalGame(null);
    navigate("/");
  }, []);

  const playable = Boolean(game?.meta.localPlay && ui);
  useEffect(() => {
    if (!playable) navigate("/");
  }, [playable]);

  if (!game || !ui || !playable) return null;

  if (!record || !snapshot) {
    const start = () => {
      const checked = checkNames(game, names);
      if (!checked.ok) return setError(checked.code);
      save(startLocal(game, gameId, checked.names, deviceRandom));
    };
    return (
      <FormLayout
        title={t("local.title")}
        back={
          <Button variant="quiet" size="sm" onClick={() => navigate("/")}>
            {t("common.back")}
          </Button>
        }
      >
        <p className="text-center text-2xl text-muted">{t("name", { ns: gameId })}</p>
        {names.map((name, i) => (
          <Field key={i} label={t("local.player", { number: i + 1 })}>
            <TextInput value={name} onChange={(e) => setNames(names.map((n, j) => (j === i ? e.target.value : n)))} maxLength={40} />
          </Field>
        ))}
        {error && <p className="text-center text-lg text-hit">{t(`error.${error}`)}</p>}
        <Button onClick={start}>{t("local.start")}</Button>
      </FormLayout>
    );
  }

  const send = (message: ClientMessage) => {
    if (message.type === "playAgain") save(playAgainLocal(game, record, deviceRandom));
  };

  const move = (raw: unknown) => {
    const result = moveLocal(game, record, raw, deviceRandom);
    if (result.ok) save(result.record);
    else setToast(result.code);
  };

  const holding = snapshot.phase === "finished" && Boolean(ui.holdsFinish) && !released;
  const Board = ui.Board;
  const message = (code: string) =>
    t(`error.${code}`, { ns: gameId, defaultValue: t(`error.${code}`, { defaultValue: t("error.generic") }) });

  return (
    <>
      {snapshot.phase === "finished" && !boards && !holding && (
        <ResultPage snapshot={snapshot} me={LOCAL_HOST} send={send} leave={leave} showBoards={() => setBoards(true)} />
      )}
      {(snapshot.phase === "playing" || boards || holding) && snapshot.view != null && (
        <Board
          view={snapshot.view}
          me={snapshot.activePlayers[0] ?? LOCAL_HOST}
          players={snapshot.players}
          send={move}
          leave={leave}
          draft={draft}
          preferences={preferences}
          online
          holding={holding}
          release={release}
          local
        />
      )}
      {boards && (
        <Button variant="secondary" size="sm" onClick={() => setBoards(false)} className="absolute top-6 right-6">
          {t("result.backToResult")}
        </Button>
      )}
      {toast && <Toast>{message(toast)}</Toast>}
    </>
  );
}
