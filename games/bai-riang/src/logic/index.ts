import type { GameDefinition, MoveResult, Outcome, PlayerId } from "@playhub/game-contract";
import { LEVELS, LIVES, TOPIC_COUNT, meta } from "./meta";
import type { Card, Move, Options, State, View } from "./types";

export type { Card, Move, Options, Reveal, View } from "./types";
export { LEVELS, LIVES, TOPIC_COUNT } from "./meta";

const MAX_NUMBER = 100;

/** N3: `perPlayer` unique numbers from 1 to 100 for each player, ascending. */
function deal(players: readonly PlayerId[], perPlayer: number, random: () => number): Record<PlayerId, number[]> {
  const pool = Array.from({ length: MAX_NUMBER }, (_, i) => i + 1);
  for (let i = 0; i < players.length * perPlayer; i++) {
    const j = i + Math.floor(random() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j] as number, pool[i] as number];
  }
  return Object.fromEntries(
    players.map((p, k) => [p, pool.slice(k * perPlayer, (k + 1) * perPlayer).sort((a, b) => a - b)]),
  );
}

/** N4: a topic not used in this game, or null when none is left. */
function drawTopic(used: readonly number[], random: () => number): number | null {
  const unused = Array.from({ length: TOPIC_COUNT }, (_, i) => i).filter((i) => !used.includes(i));
  return unused[Math.floor(random() * unused.length)] ?? null;
}

const revealedIn = (state: State) => new Set(state.reveals.flatMap((r) => [r.card, ...r.skipped.map((s) => s.card)]));

const unrevealedOf = (state: State, player: PlayerId, revealed = revealedIn(state)) =>
  (state.dealt[player] ?? []).filter((n) => !revealed.has(n));

/** The number a player reveals next, or null when they hold none. */
export const lowestOf = (state: State, player: PlayerId): number | null => unrevealedOf(state, player)[0] ?? null;

/** N8, N9: ends the game or clears the level once lives or numbers run out. */
function settle(state: State): State {
  if (state.lives <= 0) return { ...state, lives: 0, phase: "finished", won: false };
  if (state.players.length === 0) return { ...state, phase: "finished", won: false };
  const revealed = revealedIn(state);
  if (state.players.some((p) => unrevealedOf(state, p, revealed).length > 0)) return state;
  return state.level >= LEVELS ? { ...state, phase: "finished", won: true } : { ...state, phase: "cleared" };
}

function reveal(state: State, player: PlayerId, card: number): MoveResult<State> {
  if (state.phase !== "playing") return { ok: false, code: "wrong_phase" };
  if (lowestOf(state, player) !== card) return { ok: false, code: "not_your_card" };

  const revealed = revealedIn(state);
  const skipped: Card[] = state.players
    .flatMap((p) => unrevealedOf(state, p, revealed).map((n) => ({ player: p, card: n })))
    .filter((c) => c.card < card)
    .sort((x, y) => x.card - y.card);
  const reveals = [...state.reveals, { player, card, skipped }];
  return { ok: true, state: settle({ ...state, reveals, lives: state.lives - skipped.length }) };
}

function nextLevel(state: State, level: number, random: () => number): MoveResult<State> {
  if (state.phase !== "cleared" || level !== state.level + 1) return { ok: false, code: "wrong_phase" };
  let used = state.used;
  let topic: number | null = null;
  if (state.options.topics === "random") {
    topic = drawTopic(used, random);
    if (topic === null) {
      used = [];
      topic = drawTopic(used, random);
    }
    used = [...used, topic as number];
  }
  const dealt = deal(state.players, level, random);
  return { ok: true, state: { ...state, phase: "playing", level, topic, used, dealt, reveals: [] } };
}

function reroll(state: State, level: number, random: () => number): MoveResult<State> {
  const open = state.phase === "playing" && state.options.topics === "random" && level === state.level && state.reveals.length === 0;
  if (!open) return { ok: false, code: "wrong_phase" };
  const topic = drawTopic(state.used, random);
  if (topic === null) return { ok: false, code: "no_topics" };
  return { ok: true, state: { ...state, topic, used: [...state.used, topic] } };
}

export const baiRiang: GameDefinition<State, Move, View, Options> = {
  meta,
  defaultOptions: { topics: "random" },

  parseOptions(raw) {
    if (typeof raw !== "object" || raw === null) return null;
    const { topics } = raw as Record<string, unknown>;
    return topics === "random" || topics === "agreed" ? { topics } : null;
  },

  parseMove(raw) {
    if (typeof raw !== "object" || raw === null) return null;
    const { type, card, level } = raw as Record<string, unknown>;
    if (type === "play" && Number.isInteger(card)) return { type, card: card as number };
    if ((type === "next" || type === "reroll") && Number.isInteger(level)) return { type, level: level as number };
    return null;
  },

  setup({ players, options, random }) {
    const topic = options.topics === "random" ? drawTopic([], random) : null;
    return {
      phase: "playing",
      options,
      players: [...players],
      started: [...players],
      level: 1,
      lives: LIVES,
      topic,
      used: topic === null ? [] : [topic],
      dealt: deal(players, 1, random),
      reveals: [],
      out: [],
      won: null,
    };
  },

  applyMove(state, player, move, random) {
    if (move.type === "play") return reveal(state, player, move.card);
    if (move.type === "next") return nextLevel(state, move.level, random);
    return reroll(state, move.level, random);
  },

  activePlayers(state) {
    if (state.phase === "cleared") return [...state.players];
    if (state.phase !== "playing") return [];
    const revealed = revealedIn(state);
    return state.players.filter((p) => unrevealedOf(state, p, revealed).length > 0);
  },

  eliminatedPlayers() {
    return [];
  },

  removePlayer(state, player) {
    if (state.phase === "finished" || !state.players.includes(player)) return state;
    const { [player]: _discarded, ...dealt } = state.dealt;
    const players = state.players.filter((p) => p !== player);
    const removed = { ...state, players, dealt, out: [...state.out, player] };
    return state.phase === "playing" || players.length === 0 ? settle(removed) : removed;
  },

  outcome(state): Outcome {
    if (state.phase !== "finished") return { done: false };
    return { done: true, ranking: [[...state.started]], team: state.won ? "won" : "lost" };
  },

  viewFor(state, viewer) {
    const revealed = revealedIn(state);
    return {
      phase: state.phase,
      topics: state.options.topics,
      level: state.level,
      lives: state.lives,
      topic: state.topic,
      mine: viewer && state.players.includes(viewer) ? [...(state.dealt[viewer] ?? [])] : [],
      left: Object.fromEntries(state.players.map((p) => [p, unrevealedOf(state, p, revealed).length])),
      reveals: state.reveals,
      won: state.won,
    };
  },
};
