import { fourInARow } from "@playhub/game-four-in-a-row/logic";
import type { GameDefinition } from "@playhub/game-contract";
import { seededRandom } from "@playhub/game-contract/testing";
import { describe, expect, it } from "vitest";
import { LOCAL_HOST, checkNames, moveLocal, playAgainLocal, snapshotOf, startLocal } from "./local-game";

const game = fourInARow as unknown as GameDefinition<unknown, unknown, unknown, unknown>;
const random = seededRandom(3);

function play(columns: number[]) {
  let record = startLocal(game, "four-in-a-row", ["มีนา", "Arm"], random);
  for (const column of columns) {
    const result = moveLocal(game, record, { type: "drop", column }, random);
    if (!result.ok) throw new Error(result.code);
    record = result.record;
  }
  return record;
}

describe("local play names (O2)", () => {
  it("accepts one valid, distinct name per seat", () => {
    expect(checkNames(game, [" มีนา ", "Arm"])).toEqual({ ok: true, names: ["มีนา", "Arm"] });
  });

  it("refuses a seat count outside the game's range", () => {
    expect(checkNames(game, ["มีนา"])).toEqual({ ok: false, code: "not_enough_players" });
  });

  it("refuses an empty or too long name", () => {
    expect(checkNames(game, ["", "Arm"])).toEqual({ ok: false, code: "name_invalid" });
    expect(checkNames(game, ["a".repeat(17), "Arm"])).toEqual({ ok: false, code: "name_invalid" });
  });

  it("refuses the same name twice, ignoring case", () => {
    expect(checkNames(game, ["Arm", "arm"])).toEqual({ ok: false, code: "name_taken" });
  });
});

describe("local play (O3, O4)", () => {
  it("seats every name with a local id, and shows the active seat's view", () => {
    const snapshot = snapshotOf(game, startLocal(game, "four-in-a-row", ["มีนา", "Arm"], random));
    expect(snapshot.players.map((p) => [p.id, p.name])).toEqual([
      ["local-1", "มีนา"],
      ["local-2", "Arm"],
    ]);
    expect(snapshot.phase).toBe("playing");
    expect(snapshot.activePlayers).toHaveLength(1);
    expect(snapshot.hostId).toBe(LOCAL_HOST);
    expect(snapshot.view).not.toBeNull();
  });

  it("plays a move as the active seat, and bumps the version", () => {
    const start = startLocal(game, "four-in-a-row", ["มีนา", "Arm"], random);
    const before = snapshotOf(game, start).activePlayers[0];
    const result = moveLocal(game, start, { type: "drop", column: 3 }, random);
    if (!result.ok) throw new Error(result.code);
    expect(result.record.version).toBe(start.version + 1);
    expect(snapshotOf(game, result.record).activePlayers[0]).not.toBe(before);
  });

  it("survives a JSON round trip, so a reload resumes it (O6)", () => {
    const record = play([3, 3]);
    expect(snapshotOf(game, JSON.parse(JSON.stringify(record)))).toEqual(snapshotOf(game, record));
  });
});

describe("rejected local moves (O5)", () => {
  it("returns the game's code and keeps the record", () => {
    const record = play([0, 0, 0, 0, 0, 0]);
    expect(moveLocal(game, record, { type: "drop", column: 0 }, random)).toEqual({ ok: false, code: "column_full" });
  });

  it("refuses a move the game can't parse", () => {
    expect(moveLocal(game, play([]), { type: "fire" }, random)).toEqual({ ok: false, code: "invalid_move" });
  });
});

describe("end of a local game (O7)", () => {
  const won = play([0, 1, 0, 1, 0, 1, 0]);

  it("finishes with a ranking", () => {
    const snapshot = snapshotOf(game, won);
    expect(snapshot.phase).toBe("finished");
    expect(snapshot.ranking?.flat().sort()).toEqual(["local-1", "local-2"]);
    expect(moveLocal(game, won, { type: "drop", column: 5 }, random)).toEqual({ ok: false, code: "wrong_phase" });
  });

  it("plays again with the same names", () => {
    const again = playAgainLocal(game, won, random);
    expect(again.names).toEqual(won.names);
    expect(snapshotOf(game, again).phase).toBe("playing");
    expect(again.version).toBeGreaterThan(won.version);
  });
});
