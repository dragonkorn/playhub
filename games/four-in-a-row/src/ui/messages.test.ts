import { describe, expect, it } from "vitest";
import { messages } from "./messages";

describe("Four in a Row translations (I1, I2)", () => {
  it("has the same keys in Thai and English", () => {
    expect(Object.keys(messages.en).sort()).toEqual(Object.keys(messages.th).sort());
  });

  it("uses the agreed Thai name, never the trademark", () => {
    expect(messages.th.name).toBe("เรียงสี่");
    expect(JSON.stringify(messages)).not.toMatch(/connect\s*four/i);
  });

  it("covers every rejection code", () => {
    for (const code of ["wrong_phase", "off_board", "column_full"]) expect(messages.th[`error.${code}`]).toBeTruthy();
  });

  it("gives the result screen its lines (L7)", () => {
    expect(messages.th["result.win"]).toBeTruthy();
    expect(messages.th["result.draw"]).toBeTruthy();
  });
});
