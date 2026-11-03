import { useLogPlayback } from "@playhub/ui";
import type { Shot, View } from "../../logic/types";
import { STAGE_MS, stagesFor, type Stage } from "./playback";
import { sounds } from "./sounds";

const WHISTLE_DELAY_MS = 90;

function playStage(stage: Stage, speed: number): (() => void) | void {
  if (stage === "miss") sounds.play("splash");
  if (stage === "hit") sounds.play("explosion");
  if (stage === "sunk") sounds.play("explosion-big");
  if (stage === "eliminated") sounds.play("eliminated");
  if (stage === "flight") {
    sounds.play("launch");
    const timer = setTimeout(() => sounds.play("whistle"), WHISTLE_DELAY_MS / speed);
    return () => clearTimeout(timer);
  }
}

export interface Playback {
  /** How many shots have landed on this screen. */
  revealed: number;
  shot: Shot | null;
  stage: Stage | null;
  playing: boolean;
}

/** Plays new shots one at a time, in log order (B33). */
export function usePlayback(view: View, online: boolean, speed: number): Playback {
  const { item, ...playback } = useLogPlayback({
    items: view.shots,
    online,
    speed,
    stagesFor: (shots, index) => stagesFor(shots, index).map((stage) => ({ stage, ms: STAGE_MS[stage] })),
    revealAfter: "flight",
    onStage: (stage) => playStage(stage, speed),
  });
  return { ...playback, shot: item };
}
