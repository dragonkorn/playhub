import { useEffect, useRef, useState } from "react";

/** A reconnecting device skips what it missed (B33, F19). */
export const nextRevealed = (revealed: number, total: number, resync: boolean) => (resync ? total : revealed);

export interface PlaybackStage<Stage extends string> {
  stage: Stage;
  ms: number;
}

export interface LogPlaybackInput<Item, Stage extends string> {
  /** The game's public log, such as shots or drops. */
  items: readonly Item[];
  online: boolean;
  speed: number;
  stagesFor: (items: readonly Item[], index: number) => PlaybackStage<Stage>[];
  /** The item counts as landed once this stage ends. */
  revealAfter: Stage;
  /** Starts a stage's side effects, such as sounds. Returns a cleanup. */
  onStage?: (stage: Stage, item: Item) => (() => void) | void;
}

export interface LogPlayback<Item, Stage extends string> {
  /** How many items have landed on this screen. */
  revealed: number;
  item: Item | null;
  stage: Stage | null;
  playing: boolean;
}

/** Plays new log items one at a time, in log order. */
export function useLogPlayback<Item, Stage extends string>(input: LogPlaybackInput<Item, Stage>): LogPlayback<Item, Stage> {
  const { items, online, speed } = input;
  const total = items.length;
  const [revealed, setRevealed] = useState(total);
  const [step, setStep] = useState<{ index: number; stage: number } | null>(null);
  const latest = useRef(input);
  latest.current = input;
  const offlineItems = useRef<readonly Item[] | null>(online ? null : items);

  useEffect(() => {
    if (!online) {
      offlineItems.current ??= items;
    } else if (offlineItems.current && offlineItems.current !== items) {
      offlineItems.current = null;
      setRevealed((current) => nextRevealed(current, total, true));
      setStep(null);
    }
  }, [online, items, total]);

  useEffect(() => {
    if (!step && revealed < total) setStep({ index: revealed, stage: 0 });
  }, [step, revealed, total]);

  useEffect(() => {
    if (!step) return;
    const { items: log, stagesFor, revealAfter, onStage } = latest.current;
    const stages = stagesFor(log, step.index);
    const current = stages[step.stage];
    const item = log[step.index];
    if (!current || item === undefined) return setStep(null);

    const stop = onStage?.(current.stage, item);
    const timer = setTimeout(() => {
      if (current.stage === revealAfter) setRevealed(step.index + 1);
      setStep(step.stage + 1 < stages.length ? { index: step.index, stage: step.stage + 1 } : null);
    }, current.ms / speed);
    return () => {
      clearTimeout(timer);
      stop?.();
    };
  }, [step, speed]);

  const stages = step ? input.stagesFor(items, step.index) : [];
  return {
    revealed,
    item: step ? (items[step.index] ?? null) : null,
    stage: step ? (stages[step.stage]?.stage ?? null) : null,
    playing: step !== null || revealed < total,
  };
}
