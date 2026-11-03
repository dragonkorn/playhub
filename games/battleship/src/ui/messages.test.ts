import { describe, expect, it } from "vitest";
import { SHIP_IDS } from "../logic/fleet";
import { messages } from "./messages";

describe("Battleship translations (I1, I2)", () => {
  it("has the same keys in Thai and English", () => {
    expect(Object.keys(messages.en).sort()).toEqual(Object.keys(messages.th).sort());
  });

  it("names every ship", () => {
    for (const ship of SHIP_IDS) expect(messages.th[`ship.${ship}`]).toBeTruthy();
  });

  it("uses the agreed Thai ship names", () => {
    expect(messages.th["ship.carrier"]).toBe("เรือบรรทุกเครื่องบิน");
    expect(messages.th["ship.destroyer"]).toBe("เรือพิฆาต");
  });

  it("gives the result screen its line (L7)", () => {
    expect(messages.th["result.win"]).toBe("กองสุดท้ายที่เหลืออยู่");
  });

  it("covers every rejection code", () => {
    for (const code of ["wrong_phase", "already_ready", "invalid_fleet", "invalid_target", "off_board", "already_shot"]) {
      expect(messages.th[`error.${code}`]).toBeTruthy();
    }
  });
});
