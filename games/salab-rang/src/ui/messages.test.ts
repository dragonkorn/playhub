import { describe, expect, it } from "vitest";
import { ROLES } from "../logic/types";
import { messages } from "./messages";

describe("messages (I1, I2)", () => {
  it("has the same keys in Thai and English", () => {
    expect(Object.keys(messages.en).sort()).toEqual(Object.keys(messages.th).sort());
  });

  it("covers every role, rejection and start code", () => {
    for (const role of ROLES) {
      for (const part of ["name", "power", "short"]) expect(messages.th[`role.${role}.${part}`]).toBeTruthy();
    }
    for (const code of ["wrong_phase", "bad_target", "blessed", "bad_role", "muted", "deck_size", "deck_police"]) {
      expect(messages.th[`error.${code}`]).toBeTruthy();
    }
    for (const code of ["deck_size", "deck_police"]) expect(messages.th[`start.${code}`]).toBeTruthy();
  });

  it("names every event and result line", () => {
    const powers = ROLES.filter((r) => r !== "dog" && r !== "medium");
    for (const key of [...powers, "caught", "found", "skipped"]) expect(messages.th[`event.power.${key}`]).toBeTruthy();
    for (const reason of ["goal", "rounds", "players"]) expect(messages.th[`result.${reason}`]).toBeTruthy();
  });
});
