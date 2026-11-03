import { describe, expect, it } from "vitest";
import { messages } from "./messages";

const roomCodes = [
  "room_not_found", "room_full", "game_started", "name_taken", "name_invalid", "host_only", "not_enough_players",
  "players_disconnected", "not_your_turn", "stale", "server_busy",
];

describe("platform translations (I1, I2)", () => {
  it("has the same keys in Thai and English", () => {
    expect(Object.keys(messages.en).sort()).toEqual(Object.keys(messages.th).sort());
  });

  it("says draw for a tie, and leaves the line above the result to the game (L6, L7)", () => {
    expect(messages.th["result.draw"]).toBe("เสมอ");
    expect(messages.th["result.last"]).toBeUndefined();
  });

  it("covers the server's rejection and join codes", () => {
    for (const code of roomCodes) expect(messages.th[`error.${code}`]).toBeTruthy();
  });
});
