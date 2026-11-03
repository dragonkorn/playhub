import { describe, expect, it } from "vitest";
import { nextRevealed } from "./log-playback";

describe("log playback queue (B33, F19)", () => {
  it("keeps unplayed items for playback in log order", () => {
    expect(nextRevealed(1, 4, false)).toBe(1);
  });

  it("skips everything a reconnecting device missed", () => {
    expect(nextRevealed(1, 4, true)).toBe(4);
  });
});
