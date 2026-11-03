import { describe, expect, it } from "vitest";
import type { Drop, View } from "../../logic/types";
import { STAGE_MS, fallMs, revealedView, stagesFor } from "./playback";

const view = (overrides: Partial<View> = {}): View => ({
  phase: "playing",
  order: ["a", "b"],
  current: "a",
  drops: [],
  winner: null,
  line: null,
  out: [],
  ...overrides,
});

const at = (player: string, row: number, column: number): Drop => ({ player, row, column });

describe("stages of a drop (F18)", () => {
  it("plays fall, then land", () => {
    const v = view({ drops: [at("a", 0, 3)] });
    expect(stagesFor(v, 0).map((s) => s.stage)).toEqual(["fall", "land"]);
  });

  it("uses the spec's timing", () => {
    expect(STAGE_MS).toEqual({ land: 300, win: 2200, draw: 2000 });
  });

  it("falls longer the further the disc drops", () => {
    expect(fallMs(5)).toBe(200);
    expect(fallMs(0)).toBe(450);
    const v = view({ drops: [at("a", 0, 3)] });
    expect(stagesFor(v, 0)[0]).toEqual({ stage: "fall", ms: 450 });
  });

  it("adds the win moment on the winning drop only", () => {
    const drops = [at("a", 0, 0), at("b", 1, 0), at("a", 0, 1)];
    const won = view({ phase: "finished", current: null, drops, winner: "a", line: [{ row: 0, column: 0 }] });
    expect(stagesFor(won, 1).map((s) => s.stage)).toEqual(["fall", "land"]);
    expect(stagesFor(won, 2).map((s) => s.stage)).toEqual(["fall", "land", "win"]);
  });

  it("adds the draw moment on the drop that fills the board", () => {
    const drops = Array.from({ length: 42 }, (_, i) => at(i % 2 ? "b" : "a", Math.floor(i / 7), i % 7));
    const drawn = view({ phase: "finished", current: null, drops });
    expect(stagesFor(drawn, 41).map((s) => s.stage)).toEqual(["fall", "land", "draw"]);
  });

  it("adds nothing when a player leaves, because no drop ended the game (F11)", () => {
    const left = view({ phase: "finished", current: null, drops: [at("a", 0, 0)], winner: "b", out: ["a"] });
    expect(stagesFor(left, 0).map((s) => s.stage)).toEqual(["fall", "land"]);
  });
});

describe("hiding drops until they land (F19)", () => {
  const drops = [at("a", 0, 0), at("b", 1, 0), at("a", 0, 1)];
  const won = view({ phase: "finished", current: null, drops, winner: "a", line: [{ row: 0, column: 1 }] });

  it("holds only landed drops, and no result yet", () => {
    const shown = revealedView(won, 2);
    expect(shown.drops).toEqual(drops.slice(0, 2));
    expect(shown.winner).toBeNull();
    expect(shown.line).toBeNull();
    expect(shown.phase).toBe("playing");
  });

  it("is the full view once everything has landed", () => {
    expect(revealedView(won, 3)).toEqual(won);
  });
});
