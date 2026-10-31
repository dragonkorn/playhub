import { useEffect, useRef, useState } from "react";
import type { Shot, View } from "../../logic/types";
import { STAGE_MS, nextRevealed, stagesFor, type Stage } from "./playback";
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
  const total = view.shots.length;
  const [revealed, setRevealed] = useState(total);
  const [step, setStep] = useState<{ index: number; stage: number } | null>(null);
  const shots = useRef(view.shots);
  shots.current = view.shots;
  const offlineView = useRef<View | null>(online ? null : view);

  useEffect(() => {
    if (!online) {
      offlineView.current ??= view;
    } else if (offlineView.current && offlineView.current !== view) {
      offlineView.current = null;
      setRevealed((current) => nextRevealed(current, total, true));
      setStep(null);
    }
  }, [online, view, total]);

  useEffect(() => {
    if (!step && revealed < total) setStep({ index: revealed, stage: 0 });
  }, [step, revealed, total]);

  useEffect(() => {
    if (!step) return;
    const stages = stagesFor(shots.current, step.index);
    const stage = stages[step.stage];
    if (!stage) return setStep(null);

    const stopSound = playStage(stage, speed);
    const timer = setTimeout(() => {
      if (stage === "flight") setRevealed(step.index + 1);
      setStep(step.stage + 1 < stages.length ? { index: step.index, stage: step.stage + 1 } : null);
    }, STAGE_MS[stage] / speed);
    return () => {
      clearTimeout(timer);
      stopSound?.();
    };
  }, [step, speed]);

  const stages = step ? stagesFor(view.shots, step.index) : [];
  return {
    revealed,
    shot: step ? (view.shots[step.index] ?? null) : null,
    stage: step ? (stages[step.stage] ?? null) : null,
    playing: step !== null || revealed < total,
  };
}
