import { describe, expect, it } from "vitest";
import { SOUND_NAMES } from "./sound";

describe("Battleship sounds (B35)", () => {
  it("has the 8 sounds from the spec", () => {
    expect(SOUND_NAMES).toEqual(["aim", "launch", "whistle", "splash", "explosion", "explosion-big", "your-turn", "eliminated"]);
  });
});
