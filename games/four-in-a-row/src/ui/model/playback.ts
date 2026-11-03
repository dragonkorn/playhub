import type { PlaybackStage } from "@playhub/ui";
import { COLUMNS, ROWS } from "../../logic/board";
import type { View } from "../../logic/types";

export const STAGE_MS = { land: 300, win: 2200, draw: 2000 };
export type Stage = "fall" | keyof typeof STAGE_MS;

/** The disc starts in the drop row above the board (F18). */
export const fallMs = (row: number) => 150 + 50 * (ROWS - row);

export function stagesFor(view: View, index: number): PlaybackStage<Stage>[] {
  const drop = view.drops[index];
  if (!drop) return [];
  const stages: PlaybackStage<Stage>[] = [
    { stage: "fall", ms: fallMs(drop.row) },
    { stage: "land", ms: STAGE_MS.land },
  ];
  const last = index === view.drops.length - 1 && view.phase === "finished";
  if (last && view.line) stages.push({ stage: "win", ms: STAGE_MS.win });
  if (last && !view.winner && view.drops.length === COLUMNS * ROWS) stages.push({ stage: "draw", ms: STAGE_MS.draw });
  return stages;
}

/** The view as it stood when only the first `revealed` drops had landed (F19). */
export function revealedView(view: View, revealed: number): View {
  if (revealed >= view.drops.length) return view;
  return { ...view, phase: "playing", drops: view.drops.slice(0, revealed), winner: null, line: null };
}
