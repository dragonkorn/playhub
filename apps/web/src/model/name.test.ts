import { describe, expect, it } from "vitest";
import { clampName } from "./name";

describe("clampName", () => {
  it("stops typing at 10 grapheme clusters, counting Thai marks with their letter (R6)", () => {
    expect(clampName("กำ".repeat(12))).toBe("กำ".repeat(10));
    expect(clampName("เบียร์ช้างน้อยมาก")).toBe("เบียร์ช้างน้อย");
    expect(clampName("Mina")).toBe("Mina");
    expect(clampName("")).toBe("");
  });
});
