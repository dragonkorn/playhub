import { describe, expect, it } from "vitest";
import { SOUND_NAMES } from "./sound";

describe("Four in a Row sounds (F21)", () => {
  it("has the 6 sounds from the spec", () => {
    expect(SOUND_NAMES).toEqual(["select", "land", "your-turn", "win", "lose", "draw"]);
  });
});
