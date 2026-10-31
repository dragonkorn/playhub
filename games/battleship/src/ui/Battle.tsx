import type { PlayerId, RoomPlayer } from "@playhub/game-contract";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Cell, Move, Shot, View } from "../logic/types";
import { BoardGrid, cellName } from "./BoardGrid";

const DOT: Record<string, string> = {
  online: "border-online bg-online",
  reconnecting: "border-signal bg-transparent",
  lost: "border-hit bg-hit",
};

function Dot({ player }: { player: RoomPlayer | undefined }) {
  const { t } = useTranslation("battleship");
  const state = player?.status === "lost" ? "lost" : (player?.connection ?? "online");
  return <span role="img" aria-label={t(`status.${state}`)} className={`h-3 w-3 flex-none rounded-full border-2 ${DOT[state]}`} />;
}

interface Props {
  view: View;
  me: PlayerId;
  players: readonly RoomPlayer[];
  send: (move: Move) => void;
  leave: () => void;
}

export function Battle({ view, me, players, send, leave }: Props) {
  const { t } = useTranslation("battleship");
  const [chosen, setChosen] = useState<PlayerId | null>(null);
  const [aim, setAim] = useState<Cell | null>(null);
  const [outDismissed, setOutDismissed] = useState(false);

  const player = (id: PlayerId) => players.find((p) => p.id === id);
  const nameOf = (id: PlayerId) => (id === me ? t("battle.you") : (player(id)?.name ?? "?"));
  const shotsOn = (id: PlayerId) => view.shots.filter((s) => s.target === id);
  const isOut = (id: PlayerId) => view.out.includes(id);

  const myTurn = view.current === me;
  const opponents = view.turnOrder.filter((id) => id !== me);
  const alive = opponents.filter((id) => !isOut(id));
  const target = view.forcedTarget ?? (chosen && alive.includes(chosen) ? chosen : (alive[0] ?? null));
  const iAmOut = isOut(me);
  const myFleet = view.myFleet ?? [];

  const fire = () => {
    if (!aim || !target) return;
    send({ type: "fire", target, ...aim });
    setAim(null);
  };

  const logLine = (shot: Shot) =>
    t(`log.${shot.result}`, {
      shooter: nameOf(shot.shooter),
      target: nameOf(shot.target),
      cell: cellName(shot),
      ship: shot.ship ? t(`ship.${shot.ship}`) : "",
    });

  return (
    <main className="relative flex h-full flex-col gap-4 p-6">
      <header className={`flex h-16 items-center justify-between gap-6 rounded-xl px-5 ${myTurn ? "bg-signal text-ground" : "bg-panel"}`}>
        <h1 className="font-display text-4xl font-bold">
          {myTurn ? t("turn.you") : t("turn.player", { name: player(view.current ?? "")?.name ?? "" })}
        </h1>
        <p className={`text-lg font-medium ${myTurn ? "" : "text-muted"}`}>
          {!myTurn
            ? t("turn.standBy")
            : view.forcedTarget
              ? t("turn.robin", { name: nameOf(view.forcedTarget) })
              : t("turn.free")}
        </p>
      </header>

      <div className="grid min-h-0 grow grid-cols-[250px_584px_250px] justify-between">
        <section className="flex flex-col gap-1.5">
          <h2 className="mb-1 text-lg font-bold text-muted">{myTurn ? t("battle.opponents") : t("battle.order")}</h2>
          {(myTurn ? opponents : view.turnOrder).map((id) => {
            const locked = !myTurn || isOut(id) || (view.forcedTarget !== null && id !== view.forcedTarget);
            const highlighted = myTurn ? id === target : id === view.current;
            return (
              <button
                key={id}
                type="button"
                disabled={locked}
                aria-pressed={highlighted}
                onClick={() => {
                  setChosen(id);
                  setAim(null);
                }}
                className={`flex h-14 items-center gap-2.5 rounded-xl border-3 bg-panel px-3 text-left ${highlighted ? "border-signal" : "border-transparent"} ${isOut(id) ? "text-muted" : ""}`}
              >
                <Dot player={player(id)} />
                <span className="grow truncate text-xl font-bold">{id === me ? player(id)?.name : nameOf(id)}</span>
                <span className="text-base text-muted">
                  {isOut(id) ? t("battle.out") : t("battle.of", { count: view.shipsLeft[id] ?? 0 })}
                </span>
              </button>
            );
          })}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold">
            {myTurn && target ? t("battle.waters", { name: nameOf(target) }) : t("battle.yourFleet")}
          </h2>
          {myTurn && target ? (
            <BoardGrid cell={54} shots={shotsOn(target)} ships={view.sunk[target]} sunk={view.sunk[target]} selected={aim} onCell={setAim} />
          ) : (
            <BoardGrid cell={54} ships={myFleet} shots={shotsOn(me)} sunk={view.sunk[me]} />
          )}
        </section>

        <section className="flex min-h-0 flex-col gap-3">
          {myTurn ? (
            <>
              <h2 className="text-lg font-bold text-muted">{t("battle.yourFleet")}</h2>
              <BoardGrid cell={21} labels={false} ships={myFleet} shots={shotsOn(me)} sunk={view.sunk[me]} />
              <p className="text-base text-muted">{t("battle.shipsLeft", { count: view.shipsLeft[me] ?? 0 })}</p>
              {aim ? (
                <button type="button" onClick={fire} className="mt-auto h-24 rounded-2xl bg-hit text-3xl font-bold text-ground">
                  {t("battle.fire", { cell: cellName(aim) })}
                </button>
              ) : (
                <p className="mt-auto flex h-24 items-center justify-center rounded-2xl border-2 border-dashed border-line text-center text-lg text-muted">
                  {t("battle.aim")}
                </p>
              )}
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold text-muted">{t("battle.log")}</h2>
              <ol className="flex min-h-0 flex-col gap-2 overflow-hidden">
                {[...view.shots].reverse().slice(0, 7).map((shot, i) => (
                  <li key={view.shots.length - i} className={`rounded-xl bg-panel px-3.5 py-2.5 text-base ${shot.result === "sunk" ? "font-bold text-hit" : ""}`}>
                    {logLine(shot)}
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>
      </div>

      {iAmOut && !outDismissed && (
        <div className="absolute inset-0 flex items-center justify-center bg-ground/85">
          <div className="flex w-[520px] flex-col gap-5 rounded-2xl bg-panel p-10">
            <h2 className="font-display text-6xl font-bold text-hit">
              {view.shipsLeft[me] === 0 ? t("out.sunkTitle") : t("out.lostTitle")}
            </h2>
            <p className="text-2xl text-muted">{view.shipsLeft[me] === 0 ? t("out.sunkBody") : t("out.lostBody")}</p>
            <button type="button" onClick={() => setOutDismissed(true)} className="h-20 rounded-2xl bg-signal text-2xl font-bold text-ground">
              {t("out.watch")}
            </button>
            <button type="button" onClick={leave} className="h-18 rounded-2xl border-2 border-line bg-panel text-xl font-bold">
              {t("out.leave")}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
