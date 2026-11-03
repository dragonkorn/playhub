import { describe, expect, it } from "vitest";
import { HOLD_MS, holdDone, holdProgress } from "./hold";

describe("hold to reveal (N16)", () => {
  it("takes 1 second", () => {
    expect(HOLD_MS).toBe(1000);
  });

  it("fills while held and fires only after the full hold", () => {
    expect(holdProgress(null, 500)).toBe(0);
    expect(holdProgress(1000, 1500)).toBe(0.5);
    expect(holdProgress(1000, 3000)).toBe(1);
    expect(holdDone(1000, 1999)).toBe(false);
    expect(holdDone(1000, 2000)).toBe(true);
  });

  it("never fires once released", () => {
    expect(holdDone(null, 5000)).toBe(false);
  });
});
