import { describe, expect, it } from "vitest";
import type { View } from "../../logic/types";
import { claimable, eventLines, nearGoal, screenOf, stripOf, swappable } from "./board";
import { emptyPick, isComplete, needOf, powerOf, tap } from "./pick";

const view = (patch: Partial<View> = {}): View => ({
  phase: "turn",
  goal: 15,
  round: 1,
  rounds: 4,
  order: ["a", "b", "c", "d"],
  deck: ["vendor", "pickpocket", "police", "seer"],
  coins: { a: 5, b: 9, c: 13, d: 9 },
  current: "a",
  actor: null,
  claim: null,
  answered: [],
  myAnswer: null,
  hidden: ["a", "b", "c", "d"],
  blessed: [],
  muted: [],
  cards: {},
  log: [],
  reason: null,
  ...patch,
});

describe("screenOf (W9 to W27)", () => {
  it("picks the screen for each phase and seat", () => {
    expect(screenOf(view({ phase: "memorize", hidden: [] }), "a")).toEqual({ kind: "memorize", hidden: false });
    expect(screenOf(view({ phase: "memorize", hidden: ["a"] }), "a")).toEqual({ kind: "memorize", hidden: true });
    expect(screenOf(view(), "a")).toEqual({ kind: "turn" });
    expect(screenOf(view(), "b")).toEqual({ kind: "waiting" });
    expect(screenOf(view({ phase: "peek", cards: { a: "seer" } }), "a")).toEqual({ kind: "peek", role: "seer" });
    expect(screenOf(view({ phase: "challenge", claim: { player: "a", role: "seer" } }), "a")).toEqual({ kind: "claimed" });
    expect(screenOf(view({ phase: "challenge", claim: { player: "a", role: "seer" } }), "b")).toEqual({ kind: "challenge" });
    expect(screenOf(view({ phase: "power", actor: "b", claim: { player: "a", role: "seer" } }), "b")).toEqual({ kind: "power", role: "seer" });
    expect(screenOf(view({ phase: "power", actor: "b", claim: { player: "a", role: "seer" } }), "a")).toEqual({ kind: "waiting" });
    expect(screenOf(view({ phase: "secret", actor: "a", cards: { b: "seer" } }), "a")).toEqual({ kind: "secret" });
    expect(screenOf(view({ phase: "massage", actor: "b", cards: { b: "police" } }), "b")).toEqual({ kind: "massage", role: "police" });
    expect(screenOf(view({ phase: "finished" }), "a")).toEqual({ kind: "finished" });
    expect(screenOf(view(), "z")).toEqual({ kind: "waiting" });
  });

  it("shows a revealed claimant their own card, true or false (W36)", () => {
    const reveal = view({
      phase: "reveal",
      actor: "b",
      claim: { player: "a", role: "seer" },
      cards: { a: "vendor", b: "seer" },
    });
    expect(screenOf(reveal, "a")).toEqual({ kind: "revealed", role: "vendor", owner: false, acting: false });
    expect(screenOf(reveal, "b")).toEqual({ kind: "revealed", role: "seer", owner: true, acting: true });
    expect(screenOf(reveal, "c")).toEqual({ kind: "waiting" });
  });

  it("shows the gossip's target their card to hold up (W22)", () => {
    const shown = view({ phase: "shown", actor: "c", cards: { c: "pickpocket" } });
    expect(screenOf(shown, "c")).toEqual({ kind: "shown", role: "pickpocket" });
    expect(screenOf(shown, "a")).toEqual({ kind: "waiting" });
  });
});

describe("stripOf (W31, W32)", () => {
  it("starts from the viewer, in turn order, with each chip's marks", () => {
    const chips = stripOf(view({ blessed: ["b"], muted: ["d"], current: "c" }), "c", []);
    expect(chips.map((c) => c.id)).toEqual(["c", "d", "a", "b"]);
    expect(chips[0]).toMatchObject({ me: true, current: true, leader: true, near: true });
    expect(chips.find((c) => c.id === "b")).toMatchObject({ blessed: true, leader: false, near: false });
    expect(chips.find((c) => c.id === "d")).toMatchObject({ muted: true });
  });

  it("marks who hasn't hidden, and who has answered", () => {
    const memorize = stripOf(view({ phase: "memorize", hidden: ["a"] }), "a", []);
    expect(memorize.map((c) => c.unhidden)).toEqual([false, true, true, true]);
    const challenge = stripOf(view({ phase: "challenge", claim: { player: "a", role: "seer" }, answered: ["c"] }), "a", []);
    expect(challenge.map((c) => c.answered)).toEqual([false, false, true, false]);
  });

  it("keeps the seat order for a watcher", () => {
    expect(stripOf(view(), "z", []).map((c) => c.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("turns coins orange within 3 of the goal", () => {
    expect([nearGoal(11, 15), nearGoal(12, 15)]).toEqual([false, true]);
  });
});

describe("choices", () => {
  it("lets the player swap with anyone else who isn't blessed (W11)", () => {
    expect(swappable(view({ blessed: ["c"] }), "a")).toEqual(["b", "d"]);
  });

  it("offers every role in the deck except the dog (W13)", () => {
    expect(claimable(view({ deck: ["vendor", "dog"] }))).toEqual(["vendor"]);
  });
});

describe("pick (W18, W33)", () => {
  it("knows what each power needs", () => {
    expect(needOf("vendor")).toBe("one");
    expect(needOf("seer")).toBe("two");
    expect(needOf("taxi")).toBe("fromTo");
    expect(needOf("magician")).toBe("none");
  });

  it("builds a single-target power, replacing the choice on a new tap", () => {
    let pick = tap(emptyPick("police"), "b");
    pick = tap(pick, "c");
    expect(powerOf(pick)).toEqual({ role: "police", target: "c" });
    expect(powerOf(tap(emptyPick("vendor"), "d"))).toEqual({ role: "vendor", customer: "d" });
  });

  it("builds the seer's pair, toggling a tapped player off", () => {
    let pick = tap(tap(emptyPick("seer"), "b"), "c");
    expect(powerOf(pick)).toEqual({ role: "seer", targets: ["b", "c"] });
    pick = tap(pick, "b");
    expect(isComplete(pick)).toBe(false);
    expect(powerOf(tap(tap(pick, "d"), "a"))).toEqual({ role: "seer", targets: ["d", "a"] });
  });

  it("builds the taxi's source then destination", () => {
    const pick = tap(tap(emptyPick("taxi"), "b"), "d");
    expect(powerOf(pick)).toEqual({ role: "taxi", from: "b", to: "d" });
    expect(tap(pick, "c").targets).toEqual(["c"]);
  });

  it("is complete at once for powers without a target", () => {
    expect(powerOf(emptyPick("collector"))).toEqual({ role: "collector" });
  });

  it("wraps the channeled power for the medium (W20)", () => {
    const pick = tap(emptyPick("medium", "thug"), "b");
    expect(powerOf(pick)).toEqual({ role: "medium", as: { role: "thug", target: "b" } });
    expect(isComplete(emptyPick("medium"))).toBe(false);
  });
});

describe("eventLines (W39)", () => {
  it("describes public events, newest first, without hidden details", () => {
    const lines = eventLines([
      { kind: "swap", player: "a", target: "b" },
      { kind: "claim", player: "b", role: "seer", challengers: ["c"] },
      { kind: "reveal", cards: [{ player: "b", role: "vendor", owner: false }, { player: "c", role: "seer", owner: true }] },
      { kind: "coins", changes: { b: -1 } },
      { kind: "power", player: "c", role: "pickpocket", targets: ["d"], caught: true },
    ]);
    expect(lines.map((l) => l.key)).toEqual(["event.power.caught", "event.coins", "event.reveal", "event.claimChallenged", "event.swap"]);
    expect(lines[2]?.params).toEqual({ cards: [{ player: "b", role: "vendor", owner: false }, { player: "c", role: "seer", owner: true }] });
    expect(lines[4]?.params).toEqual({ player: "a", target: "b" });
  });

  it("names the channeled role and skipped powers", () => {
    const [medium, skipped] = eventLines([
      { kind: "power", player: "a", role: "medium", targets: [], skipped: true },
      { kind: "power", player: "a", role: "medium", as: "thug", targets: ["b"] },
    ]);
    expect(medium).toMatchObject({ key: "event.power.thug", params: { player: "a", via: "medium", targets: ["b"] } });
    expect(skipped?.key).toBe("event.power.skipped");
  });
});
