import type { Orientation } from "@playhub/game-contract";

/** C5, ADR-0007: every screen is laid out at one of these sizes, then scaled to fit. */
export const FRAMES: Record<Orientation, { width: number; height: number }> = {
  landscape: { width: 1180, height: 820 },
  portrait: { width: 390, height: 844 },
};

/** Platform screens lay out for both orientations. */
export const BOTH: readonly Orientation[] = ["landscape", "portrait"];

/** The frame for a viewport, and the orientation to ask for when the screen can't follow it. */
export function frameFor(width: number, height: number, allowed: readonly Orientation[]) {
  const viewport: Orientation = height > width ? "portrait" : "landscape";
  if (allowed.includes(viewport)) return { orientation: viewport, rotate: null };
  const fallback = allowed[0] ?? "landscape";
  return { orientation: fallback, rotate: fallback };
}
