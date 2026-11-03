import type { PlayerId } from "@playhub/game-contract";
import type { Reveal, View } from "../../logic/types";

/** N21: how long the mistake banner stays up. */
export const MISTAKE_MS = 2500;

export type Feedback =
  | { kind: "reveal" }
  | { kind: "mistake"; reveal: Reveal; lost: number; mine: boolean; lives: number }
  | { kind: "clear" }
  | { kind: "won" }
  | { kind: "lost" };

/** N21, N22: what to play for the change from one view to the next. A first view plays nothing. */
export function feedbackFor(previous: View | null, next: View, me: PlayerId): Feedback[] {
  if (!previous) return [];
  const fresh = previous.level === next.level ? next.reveals.slice(previous.reveals.length) : next.reveals;
  const events: Feedback[] = fresh.map((reveal) =>
    reveal.skipped.length === 0
      ? { kind: "reveal" }
      : { kind: "mistake", reveal, lost: reveal.skipped.length, mine: reveal.skipped.some((s) => s.player === me), lives: next.lives },
  );
  if (next.phase === "cleared" && previous.phase !== "cleared") events.push({ kind: "clear" });
  if (next.phase === "finished" && previous.phase !== "finished") events.push({ kind: next.won ? "won" : "lost" });
  return events;
}

export type SlotState = "next" | "waiting" | "revealed" | "skipped";

/** N15: the viewer's numbers for the large card and the strip. */
export function handOf(view: View) {
  const revealed = new Set(view.reveals.map((r) => r.card));
  const skipped = new Set(view.reveals.flatMap((r) => r.skipped.map((s) => s.card)));
  const next = view.mine.find((card) => !revealed.has(card) && !skipped.has(card)) ?? null;
  const slots = view.mine.map((card) => ({
    card,
    state: (revealed.has(card) ? "revealed" : skipped.has(card) ? "skipped" : card === next ? "next" : "waiting") as SlotState,
  }));
  const position = next === null ? view.mine.length : view.mine.indexOf(next) + 1;
  return { next, slots, position };
}
