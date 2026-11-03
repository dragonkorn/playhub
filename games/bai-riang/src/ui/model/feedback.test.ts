import { describe, expect, it } from "vitest";
import type { View } from "../../logic/types";
import { MISTAKE_MS, feedbackFor, handOf } from "./feedback";

const view = (over: Partial<View> = {}): View => ({
  phase: "playing",
  topics: "random",
  level: 1,
  lives: 3,
  topic: 0,
  mine: [23],
  left: { a: 1, b: 1, me: 1 },
  reveals: [],
  won: null,
  ...over,
});

describe("feedback (N21, N22)", () => {
  it("plays nothing for the first view, so a reconnect skips old reveals", () => {
    expect(feedbackFor(null, view({ reveals: [{ player: "a", card: 5, skipped: [] }] }), "me")).toEqual([]);
  });

  it("plays a flip for a new reveal", () => {
    const next = view({ reveals: [{ player: "a", card: 5, skipped: [] }] });
    expect(feedbackFor(view(), next, "me")).toEqual([{ kind: "reveal" }]);
  });

  it("shows a mistake banner for a reveal that skips numbers, marking the viewer's own", () => {
    const reveal = { player: "a", card: 41, skipped: [{ player: "me", card: 23 }] };
    expect(feedbackFor(view(), view({ reveals: [reveal], lives: 2 }), "me")).toEqual([
      { kind: "mistake", reveal, lost: 1, mine: true, lives: 2 },
    ]);
    expect(MISTAKE_MS).toBe(2500);
  });

  it("plays the clear sound for a cleared level, and win or lose at the end", () => {
    const reveal = { player: "me", card: 23, skipped: [] };
    expect(feedbackFor(view(), view({ reveals: [reveal], phase: "cleared" }), "me")).toEqual([{ kind: "reveal" }, { kind: "clear" }]);
    expect(feedbackFor(view(), view({ reveals: [reveal], phase: "finished", won: true }), "me")).toEqual([{ kind: "reveal" }, { kind: "won" }]);
    expect(feedbackFor(view(), view({ phase: "finished", won: false }), "me")).toEqual([{ kind: "lost" }]);
  });

  it("starts fresh on a new level", () => {
    const old = view({ phase: "cleared", reveals: [{ player: "a", card: 5, skipped: [] }] });
    expect(feedbackFor(old, view({ level: 2, reveals: [] }), "me")).toEqual([]);
  });
});

describe("hand (N15)", () => {
  it("marks each number as next, waiting, revealed or skipped", () => {
    const state = view({
      mine: [12, 40, 81],
      reveals: [
        { player: "me", card: 12, skipped: [] },
        { player: "a", card: 50, skipped: [{ player: "me", card: 40 }] },
      ],
    });
    expect(handOf(state)).toEqual({
      next: 81,
      slots: [
        { card: 12, state: "revealed" },
        { card: 40, state: "skipped" },
        { card: 81, state: "next" },
      ],
      position: 3,
    });
  });

  it("has no next number once every number is out", () => {
    expect(handOf(view({ mine: [5], reveals: [{ player: "me", card: 5, skipped: [] }] })).next).toBeNull();
  });
});
