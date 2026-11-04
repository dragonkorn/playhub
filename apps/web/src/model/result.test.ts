import type { RoomSnapshot } from "@playhub/game-contract";
import { describe, expect, it } from "vitest";
import { resultOf } from "./result";

const snapshot = (over: Partial<RoomSnapshot>): RoomSnapshot => ({
  version: 9,
  code: "K7Q2",
  gameId: "g",
  phase: "finished",
  hostId: "a",
  players: [],
  options: {},
  activePlayers: [],
  view: { level: 2 },
  ranking: [["a"], ["b"]],
  team: null,
  startError: null,
  ...over,
});

describe("resultOf", () => {
  it("names a single winner, or a draw for a shared first place (L6, L7)", () => {
    expect(resultOf(snapshot({}))).toEqual({ title: { key: "result.wins", winner: "a" }, line: { key: "result.win" }, team: false });
    expect(resultOf(snapshot({ ranking: [["a", "b"]] }))).toEqual({ title: { key: "result.draw" }, line: { key: "result.draw" }, team: false });
  });

  it("says the team won or lost, with the game's line from the final view (L8, L9)", () => {
    const line = (view: unknown) => ({ code: "result.lost", params: { level: (view as { level: number }).level } });
    expect(resultOf(snapshot({ ranking: [["a", "b"]], team: "lost" }), line)).toEqual({
      title: { key: "result.teamLost" },
      line: { key: "result.lost", params: { level: 2 } },
      team: true,
    });
    expect(resultOf(snapshot({ ranking: [["a", "b"]], team: "won" })).title).toEqual({ key: "result.teamWon" });
  });
});
