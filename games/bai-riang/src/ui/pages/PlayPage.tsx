import type { PlayerId, RoomPlayer } from "@playhub/game-contract";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Move, View } from "../../logic/types";
import { handOf } from "../model/feedback";
import { sounds } from "../model/sounds";
import { usePlayback } from "../model/use-playback";
import { HandBlock } from "../organisms/HandBlock";
import { LevelClear } from "../organisms/LevelClear";
import { MistakeBanner } from "../organisms/MistakeBanner";
import { PeopleSheet } from "../organisms/PeopleSheet";
import { RevealButton } from "../organisms/RevealButton";
import { RevealSummary } from "../organisms/RevealSummary";
import { TopBar } from "../organisms/TopBar";
import { TopicBlock } from "../organisms/TopicBlock";

const SEND_TIMEOUT_MS = 3000;

interface Props {
  view: View;
  me: PlayerId;
  players: readonly RoomPlayer[];
  send: (move: Move) => void;
  preferences: { load(name: string): unknown; save(name: string, value: unknown): void };
  online: boolean;
  holding: boolean;
  release: () => void;
}

export function PlayPage({ view, me, players, send, preferences, online, holding, release }: Props) {
  const { t } = useTranslation("bai-riang");
  const [muted, setMuted] = useState(() => preferences.load("muted") === true);
  const [hidden, setHidden] = useState(() => preferences.load("hiddenNumber") === true);
  const [sheet, setSheet] = useState(false);
  const [sentFor, setSentFor] = useState<number | null>(null);
  const { mistake } = usePlayback(view, me, holding, release);
  const { next, slots, position } = handOf(view);

  useEffect(() => sounds.setMuted(muted), [muted]);

  useEffect(() => {
    if (sentFor === null) return;
    const timer = setTimeout(() => setSentFor(null), SEND_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [sentFor]);

  const nameOf = (id: PlayerId) => (id === me ? t("sheet.you") : (players.find((p) => p.id === id)?.name ?? "?"));

  const toggle = (name: string, value: boolean, set: (value: boolean) => void) => {
    preferences.save(name, value);
    set(value);
  };

  const reveal = () => {
    if (next === null) return;
    send({ type: "play", card: next });
    setSentFor(next);
  };

  const finished = view.phase === "finished" && !holding;
  const canReroll = view.topics === "random" && view.phase === "playing" && view.reveals.length === 0;

  return (
    <main className="relative flex h-full flex-col gap-6 overflow-hidden px-10 pt-8 pb-10 tall:gap-4 tall:p-4">
      <TopBar
        level={view.phase === "cleared" || finished ? undefined : view.level}
        lives={view.phase === "cleared" || finished ? undefined : view.lives}
        players={players.length}
        muted={muted}
        onPeople={() => setSheet(true)}
        onMute={() => toggle("muted", !muted, setMuted)}
      />
      {finished ? (
        <RevealSummary level={view.level} reveals={view.reveals} nameOf={nameOf} />
      ) : view.phase === "cleared" ? (
        <LevelClear level={view.level} lives={view.lives} onNext={() => send({ type: "next", level: view.level + 1 })} />
      ) : (
        <div className="grid min-h-0 grow grid-cols-2 gap-14 tall:flex tall:flex-col tall:gap-4">
          <TopicBlock topic={view.topic} onReroll={canReroll ? () => send({ type: "reroll", level: view.level }) : undefined} />
          <div className="flex min-h-0 flex-col gap-3 tall:grow">
            <HandBlock
              next={next}
              slots={slots}
              hidden={hidden}
              onHide={() => toggle("hiddenNumber", true, setHidden)}
              onShow={() => toggle("hiddenNumber", false, setHidden)}
            />
            <RevealButton
              card={next}
              hidden={hidden}
              position={position}
              count={view.mine.length}
              disabled={!online || sentFor === next || view.phase !== "playing"}
              onReveal={reveal}
            />
          </div>
        </div>
      )}
      {sheet && <PeopleSheet players={players} me={me} left={view.left} reveals={view.reveals} onClose={() => setSheet(false)} />}
      {mistake && <MistakeBanner reveal={mistake.reveal} mine={mistake.mine} lives={mistake.lives} nameOf={nameOf} />}
    </main>
  );
}
