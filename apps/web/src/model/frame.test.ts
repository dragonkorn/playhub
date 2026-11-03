import { describe, expect, it } from "vitest";
import { BOTH, FRAMES, frameFor } from "./frame";

describe("frameFor (C5, ADR-0007)", () => {
  it("has a landscape and a portrait frame", () => {
    expect(FRAMES).toEqual({ landscape: { width: 1180, height: 820 }, portrait: { width: 390, height: 844 } });
  });

  it("follows the viewport for screens that support both", () => {
    expect(frameFor(390, 844, BOTH)).toEqual({ orientation: "portrait", rotate: null });
    expect(frameFor(1180, 820, BOTH)).toEqual({ orientation: "landscape", rotate: null });
  });

  it("keeps a landscape-only game landscape in a portrait viewport, asking to rotate", () => {
    expect(frameFor(390, 844, ["landscape"])).toEqual({ orientation: "landscape", rotate: "landscape" });
    expect(frameFor(1180, 820, ["landscape"])).toEqual({ orientation: "landscape", rotate: null });
  });

  it("uses the first listed orientation as the fallback", () => {
    expect(frameFor(1180, 820, ["portrait"])).toEqual({ orientation: "portrait", rotate: "portrait" });
  });
});
