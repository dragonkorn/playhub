import type { PlayerId, RoomPlayer } from "@playhub/game-contract";
import { Button, Dialog, GameLayout, HeaderBar } from "@playhub/ui";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Cell, Move, View } from "../../logic/types";
import { boardFor, revealedView, shownBoard } from "../model/playback";
import { sounds } from "../model/sounds";
import { usePlayback } from "../model/use-playback";
import { AimPanel } from "../organisms/AimPanel";
import { BoardGrid, cellName } from "../organisms/BoardGrid";
import { EliminatedSplash } from "../organisms/EliminatedSplash";
import { PlayerList } from "../organisms/PlayerList";
import { ShotFx } from "../organisms/ShotFx";
import { ShotLog } from "../organisms/ShotLog";
import { TurnSweep } from "../organisms/TurnSweep";

const SEND_TIMEOUT_MS = 3000;
const SWEEP_MS = 1100;

interface Props {
  view: View;
  me: PlayerId;
  players: readonly RoomPlayer[];
  send: (move: Move) => void;
  leave: () => void;
  preferences: { load(name: string): unknown; save(name: string, value: unknown): void };
  online: boolean;
  holding: boolean;
  release: () => void;
}

export function BattlePage({ view: latest, me, players, send, leave, preferences, online, holding, release }: Props) {
  const { t } = useTranslation("battleship");
  const [chosen, setChosen] = useState<PlayerId | null>(null);
  const [browsing, setBrowsing] = useState<PlayerId>(me);
  const [aim, setAim] = useState<Cell | null>(null);
  const [outDismissed, setOutDismissed] = useState(false);
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [muted, setMuted] = useState(() => preferences.load("muted") === true);
  const [sweep, setSweep] = useState(false);
  const [speed] = useState(() => Number(preferences.load("fxSpeed")) || 1);

  const playback = usePlayback(latest, online, speed);
  const { shot, stage, playing } = playback;
  const view = revealedView(latest, playback.revealed);

  const player = (id: PlayerId) => players.find((p) => p.id === id);
  const nameOf = (id: PlayerId) => (id === me ? t("battle.you") : (player(id)?.name ?? "?"));
  const isOut = (id: PlayerId) => view.out.includes(id);

  const myTurn = latest.current === me && latest.phase === "battle" && !playing;
  const awaitingShot = sentAt === latest.shots.length;
  const opponents = view.turnOrder.filter((id) => id !== me);
  const alive = opponents.filter((id) => !isOut(id));
  const target = latest.forcedTarget ?? (chosen && alive.includes(chosen) ? chosen : (alive[0] ?? null));

  const shown = shownBoard({ me, shot, browsing, aimingAt: myTurn ? target : null });
  const board = boardFor(view, shown, me);
  const aiming = myTurn && !awaitingShot;
  const targeted = shot?.target === me;

  useEffect(() => sounds.setMuted(muted), [muted]);

  useEffect(() => {
    if (holding && !playing) release();
  }, [holding, playing, release]);

  useEffect(() => {
    if (!myTurn) return;
    sounds.play("your-turn");
    setSweep(true);
    const timer = setTimeout(() => setSweep(false), SWEEP_MS / speed);
    return () => clearTimeout(timer);
  }, [myTurn, speed]);

  useEffect(() => {
    if (sentAt === null) return;
    const timer = setTimeout(() => setSentAt(null), SEND_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [sentAt]);

  const pickCell = (cell: Cell) => {
    sounds.play("aim");
    setAim(cell);
  };

  const fire = () => {
    if (!aim || !target) return;
    send({ type: "fire", target, ...aim });
    setSentAt(latest.shots.length);
    setAim(null);
  };

  const toggleMute = () => {
    preferences.save("muted", !muted);
    setMuted(!muted);
  };

  const pickPlayer = (id: PlayerId) => {
    if (myTurn) setChosen(id);
    else setBrowsing(id);
    setAim(null);
  };

  const rows = (myTurn ? opponents : view.turnOrder).map((id) => {
    const shootable = myTurn && !isOut(id) && (latest.forcedTarget === null || id === latest.forcedTarget);
    return {
      id,
      name: id === me ? (player(id)?.name ?? "") : nameOf(id),
      player: player(id),
      shipsLeft: view.shipsLeft[id] ?? 0,
      out: isOut(id),
      selected: id === shown,
      highlighted: myTurn ? id === target : id === latest.current,
      disabled: !shootable && (myTurn || playing),
    };
  });

  let headline = t("turn.player", { name: player(latest.current ?? "")?.name ?? "" });
  let detail = t("turn.standBy");
  if (shot) {
    headline = t("fx.shooting", { shooter: nameOf(shot.shooter), target: nameOf(shot.target), cell: cellName(shot) });
    detail = stage === "miss" || stage === "hit" || stage === "sunk" ? t(`fx.${stage}`) : "";
  } else if (myTurn) {
    headline = t("turn.you");
    detail = latest.forcedTarget ? t("turn.robin", { name: nameOf(latest.forcedTarget) }) : t("turn.free");
  }

  const shakeClass = !targeted ? "" : stage === "hit" ? "fx-shake" : stage === "sunk" ? "fx-bigshake" : "";
  const fellOut = view.shipsLeft[me] === 0;

  return (
    <GameLayout
      className={shakeClass}
      header={
        <HeaderBar
          title={headline}
          detail={detail}
          tone={myTurn ? "turn" : "panel"}
          action={
            <Button variant="outline" size="sm" aria-pressed={muted} onClick={toggleMute}>
              {muted ? t("sound.off") : t("sound.on")}
            </Button>
          }
        />
      }
      left={<PlayerList title={myTurn ? t("battle.opponents") : t("battle.order")} rows={rows} onPick={pickPlayer} />}
      center={
        <>
          <h2 className="text-xl font-bold">{shown === me ? t("battle.yourFleet") : t("battle.waters", { name: nameOf(shown) })}</h2>
          <div className="relative">
            <BoardGrid cell={54} {...board} selected={aiming ? aim : null} onCell={aiming && shown !== me ? pickCell : undefined} />
            {shot && stage && <ShotFx stage={stage} shot={shot} sunkShip={board.sunk.find((p) => p.ship === shot.ship)} targeted={targeted} />}
          </div>
        </>
      }
      right={
        myTurn ? <AimPanel fleet={boardFor(view, me, me)} shipsLeft={view.shipsLeft[me] ?? 0} aim={aim} onFire={fire} /> : <ShotLog shots={view.shots} nameOf={nameOf} />
      }
    >
      {targeted && (stage === "hit" || stage === "sunk") && (
        <div className={`fx-edge pointer-events-none absolute inset-0 ${stage === "sunk" ? "fx-edge-long" : ""}`} />
      )}
      {stage === "eliminated" && shot && <EliminatedSplash name={nameOf(shot.target)} />}
      {sweep && <TurnSweep />}
      {isOut(me) && !outDismissed && !playing && (
        <Dialog tone="danger" title={fellOut ? t("out.sunkTitle") : t("out.lostTitle")} body={fellOut ? t("out.sunkBody") : t("out.lostBody")}>
          <Button onClick={() => setOutDismissed(true)}>{t("out.watch")}</Button>
          <Button variant="secondary" size="lg" onClick={leave}>
            {t("out.leave")}
          </Button>
        </Dialog>
      )}
    </GameLayout>
  );
}
