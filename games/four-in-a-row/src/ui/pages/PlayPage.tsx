import type { PlayerId, RoomPlayer } from "@playhub/game-contract";
import { Button, GameLayout, HeaderBar } from "@playhub/ui";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { isFull } from "../../logic/board";
import type { Move, View } from "../../logic/types";
import type { DiscColor } from "../atoms/Disc";
import { fallMs, revealedView } from "../model/playback";
import { sounds } from "../model/sounds";
import { usePlayback } from "../model/use-playback";
import { BoardGrid } from "../organisms/BoardGrid";
import { DropPanel } from "../organisms/DropPanel";
import { MoveLog } from "../organisms/MoveLog";
import { PlayerPanel } from "../organisms/PlayerPanel";
import { ResultBanner } from "../organisms/ResultBanner";
import { TurnSweep } from "../organisms/TurnSweep";

const SEND_TIMEOUT_MS = 3000;
const SWEEP_MS = 1100;

interface Props {
  view: View;
  me: PlayerId;
  players: readonly RoomPlayer[];
  send: (move: Move) => void;
  preferences: { load(name: string): unknown; save(name: string, value: unknown): void };
  online: boolean;
  holding: boolean;
  release: () => void;
  /** Every seat plays on this device, and `me` is the active seat (O4, F23). */
  local: boolean;
}

export function PlayPage({ view: latest, me, players, send, preferences, online, holding, release, local }: Props) {
  const { t } = useTranslation("four-in-a-row");
  const [selected, setSelected] = useState<number | null>(null);
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [muted, setMuted] = useState(() => preferences.load("muted") === true);
  const [sweep, setSweep] = useState(false);
  const [speed] = useState(() => Number(preferences.load("fxSpeed")) || 1);

  const playback = usePlayback(latest, me, local, online, speed);
  const { drop, stage, playing } = playback;
  const view = revealedView(latest, playback.revealed);

  const player = (id: PlayerId) => players.find((p) => p.id === id);
  const nameOf = (id: PlayerId) => (id === me && !local ? t("players.you") : (player(id)?.name ?? "?"));
  const turnText = local ? t("turn.player", { name: nameOf(me) }) : t("turn.you");
  const colorOf = (id: PlayerId): DiscColor => (latest.order.indexOf(id) === 1 ? "red" : "yellow");

  const myTurn = latest.current === me && latest.phase === "playing" && !playing;
  const awaitingDrop = sentAt === latest.drops.length;
  const picking = myTurn && !awaitingDrop;
  const pick = selected !== null && !isFull(view.drops, selected) ? selected : null;

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

  const pickColumn = (column: number) => {
    sounds.play("select");
    setSelected(column);
  };

  const dropDisc = () => {
    if (pick === null) return;
    send({ type: "drop", column: pick });
    setSentAt(latest.drops.length);
    setSelected(null);
  };

  const toggleMute = () => {
    preferences.save("muted", !muted);
    setMuted(!muted);
  };

  const rows = latest.order.map((id) => ({
    id,
    name: player(id)?.name ?? "?",
    player: player(id),
    color: colorOf(id),
    highlighted: id === (drop ? drop.player : view.current),
  }));

  let headline = t("turn.player", { name: player(latest.current ?? "")?.name ?? "" });
  let detail = local ? "" : t("turn.standBy");
  if (drop && (stage === "fall" || stage === "land")) {
    headline = t("fx.dropping", { name: nameOf(drop.player), column: drop.column + 1 });
    detail = "";
  } else if (view.phase === "finished") {
    headline = view.winner ? t("end.win", { name: player(view.winner)?.name ?? "?" }) : t("end.draw");
    detail = t("end.detail");
  } else if (myTurn) {
    headline = turnText;
    detail = t("turn.pick");
  }

  const banner = stage === "draw" ? t("fx.draw") : stage === "win" && drop ? (drop.player === me && !local ? t("fx.youWin") : t("fx.win", { name: nameOf(drop.player) })) : null;

  return (
    <GameLayout
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
      left={<PlayerPanel rows={rows} />}
      center={
        <BoardGrid
          cell={72}
          drops={view.drops}
          colorOf={colorOf}
          falling={drop && stage === "fall" ? { drop, ms: fallMs(drop.row) / speed } : null}
          landing={stage === "land" ? drop : null}
          line={view.line}
          pulse={stage === "win"}
          selected={picking ? pick : null}
          ghost={picking ? colorOf(me) : null}
          onColumn={picking ? pickColumn : undefined}
        />
      }
      right={
        <>
          <MoveLog drops={view.drops} nameOf={nameOf} colorOf={colorOf} />
          {picking && <DropPanel selected={pick} onDrop={dropDisc} />}
        </>
      }
    >
      {banner && <ResultBanner text={banner} />}
      {sweep && <TurnSweep text={turnText} />}
    </GameLayout>
  );
}
