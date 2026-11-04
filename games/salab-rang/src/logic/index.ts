import type { GameDefinition, MoveResult, Outcome, PlayerId } from "@playhub/game-contract";
import { CHAOS_CORE, CHAOS_FILL, GOALS, NOT_CHANNELED, ROUNDS, START_COINS, STARTER, meta } from "./meta";
import { ROLES, type CardSet, type EndReason, type Event, type Move, type Options, type Power, type Role, type State, type View } from "./types";

export type { CardSet, EndReason, Event, Move, Options, Phase, Power, Role, View } from "./types";
export { ROLES } from "./types";
export { GOALS, NOT_CHANNELED, ROUNDS, START_COINS } from "./meta";

const SETS: readonly CardSet[] = ["starter", "chaos", "random", "custom"];

const isRole = (value: unknown): value is Role => ROLES.includes(value as Role);
const isId = (value: unknown): value is PlayerId => typeof value === "string" && value.length > 0;
const byCatalog = (roles: readonly Role[]): Role[] => ROLES.filter((r) => roles.includes(r));

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

/** W6, L11: why a custom deck can't start with this many players. */
function startError(options: Options, playerCount: number): string | null {
  if (options.set !== "custom") return null;
  if (options.roles.length !== playerCount) return "deck_size";
  if (options.roles.includes("pickpocket") && !options.roles.includes("police")) return "deck_police";
  return null;
}

/** W2 to W6: the characters for this game, in catalog order. */
function chooseDeck(options: Options, count: number, random: () => number): Role[] {
  switch (options.set) {
    case "chaos":
      return byCatalog([...CHAOS_CORE, ...CHAOS_FILL.slice(0, count - CHAOS_CORE.length)]);
    case "random": {
      const drawn = shuffle(ROLES, random).slice(0, count);
      if (drawn.includes("pickpocket") && !drawn.includes("police")) {
        const others = drawn.map((r, i) => (r === "pickpocket" ? -1 : i)).filter((i) => i >= 0);
        drawn[others[Math.floor(random() * others.length)] as number] = "police";
      }
      return byCatalog(drawn);
    }
    case "custom":
      if (startError(options, count) === null) return byCatalog(options.roles);
      return byCatalog(STARTER.slice(0, count));
    default:
      return byCatalog(STARTER.slice(0, count));
  }
}

const isTarget = (state: State, actor: PlayerId, target: PlayerId) => target !== actor && state.players.includes(target);
const isBlessed = (state: State, player: PlayerId) => (state.blessings[player]?.length ?? 0) > 0;

/** Moves coins, never below 0 (W24). `null` is the bank. */
class Ledger {
  readonly coins: Record<PlayerId, number>;
  readonly changes: Record<PlayerId, number> = {};

  constructor(coins: Record<PlayerId, number>) {
    this.coins = { ...coins };
  }

  move(from: PlayerId | null, to: PlayerId | null, amount: number): number {
    const paid = from === null ? amount : Math.min(amount, this.coins[from] ?? 0);
    if (paid === 0) return 0;
    if (from !== null) this.add(from, -paid);
    if (to !== null) this.add(to, paid);
    return paid;
  }

  private add(player: PlayerId, amount: number) {
    this.coins[player] = (this.coins[player] ?? 0) + amount;
    this.changes[player] = (this.changes[player] ?? 0) + amount;
  }

  /** The coins event for the log, or none when nothing moved. */
  events(): Event[] {
    const changes = Object.fromEntries(Object.entries(this.changes).filter(([, n]) => n !== 0));
    return Object.keys(changes).length > 0 ? [{ kind: "coins", changes }] : [];
  }
}

const settled = (ledger: Ledger, state: State, ...events: Event[]): State => ({
  ...state,
  coins: ledger.coins,
  log: [...state.log, ...events, ...ledger.events()],
});

function finish(state: State, reason: EndReason): State {
  return { ...state, phase: "finished", reason, claim: null, actor: null, answers: {}, looked: [], revealed: [], silenced: null };
}

/** W25: a turn starts by ending the player's blessings and applying a thug's mute. */
function startTurn(state: State, player: PlayerId): State {
  const blessings = Object.fromEntries(
    Object.entries(state.blessings)
      .map(([blessed, by]) => [blessed, by.filter((p) => p !== player)] as const)
      .filter(([, by]) => by.length > 0),
  );
  return {
    ...state,
    phase: "turn",
    current: player,
    claim: null,
    answers: {},
    actor: null,
    looked: [],
    revealed: [],
    blessings,
    muted: state.muted.filter((p) => p !== player),
    silenced: state.muted.includes(player) ? player : null,
  };
}

/** W8, W26: checks the end, then passes the turn along seat order. */
function endTurn(state: State): State {
  const ended = { ...state, silenced: null };
  if (ended.players.length < 2) return finish(ended, "players");
  if (ended.players.some((p) => (ended.coins[p] ?? 0) >= ended.options.goal)) return finish(ended, "goal");
  const seats = ended.started;
  const from = seats.indexOf(ended.current);
  for (let k = 1; k <= seats.length; k++) {
    const next = seats[(from + k) % seats.length] as PlayerId;
    if (!ended.players.includes(next)) continue;
    const wrapped = from + k >= seats.length;
    if (wrapped && ended.round >= ROUNDS) return finish(ended, "rounds");
    return startTurn({ ...ended, round: wrapped ? ended.round + 1 : ended.round }, next);
  }
  return finish(ended, "players");
}

const startPower = (state: State, player: PlayerId): State => ({ ...state, phase: "power", actor: player, revealed: [], answers: {} });

/** W16: resolves the challenge once every other player has answered. */
function settleChallenge(state: State): State {
  const claim = state.claim;
  if (!claim) return state;
  const others = state.players.filter((p) => p !== claim.player);
  if (!others.every((p) => p in state.answers)) return state;

  const challengers = others.filter((p) => state.answers[p]);
  const claimed: Event = { kind: "claim", player: claim.player, role: claim.role, challengers };
  if (challengers.length === 0) return startPower({ ...state, log: [...state.log, claimed] }, claim.player);

  const claimants = state.players.filter((p) => p === claim.player || challengers.includes(p));
  const owner = claimants.find((p) => state.cards[p] === claim.role) ?? null;
  const ledger = new Ledger(state.coins);
  for (const p of claimants) {
    if (p === owner) continue;
    ledger.move(p, null, 1);
    if (state.cards[p] === "dog") ledger.move(null, p, 2);
  }
  const reveal: Event = {
    kind: "reveal",
    cards: claimants.map((p) => ({ player: p, role: state.cards[p] as Role, owner: p === owner })),
  };
  return settled(ledger, { ...state, phase: "reveal", actor: owner ?? claim.player, revealed: claimants, answers: {} }, claimed, reveal);
}

/** W19: every unblessed card moves to the next unblessed player in turn order. */
function rotate(state: State): Record<PlayerId, Role> {
  const moving = state.players.filter((p) => !isBlessed(state, p));
  const cards = { ...state.cards };
  moving.forEach((p, i) => {
    cards[moving[(i + 1) % moving.length] as PlayerId] = state.cards[p] as Role;
  });
  return cards;
}

const targetsOf = (power: Power): PlayerId[] => {
  if ("customer" in power) return [power.customer];
  if ("target" in power) return [power.target];
  if ("targets" in power) return [...power.targets];
  if ("from" in power) return [power.from, power.to];
  return [];
};

function validTargets(state: State, actor: PlayerId, power: Power): boolean {
  const targets = targetsOf(power);
  if (new Set(targets).size !== targets.length) return false;
  return targets.every((t) => isTarget(state, actor, t));
}

/** W18 to W24: applies a power, then moves on to the phase it leads to. */
function usePower(state: State, actor: PlayerId, power: Power): MoveResult<State> {
  if (!state.claim || power.role !== state.claim.role) return { ok: false, code: "bad_role" };
  const ledger = new Ledger(state.coins);
  let effect = power;
  let as: Role | undefined;

  if (power.role === "medium") {
    effect = power.as;
    if (!state.deck.includes(effect.role) || NOT_CHANNELED.includes(effect.role)) return { ok: false, code: "bad_role" };
    if (!validTargets(state, actor, effect)) return { ok: false, code: "bad_target" };
    if (ledger.move(actor, null, 1) === 0) {
      const skipped: Event = { kind: "power", player: actor, role: "medium", targets: [], skipped: true };
      return { ok: true, state: endTurn({ ...state, log: [...state.log, skipped] }) };
    }
    as = effect.role;
  } else if (!validTargets(state, actor, effect)) {
    return { ok: false, code: "bad_target" };
  }

  const event: Event & { kind: "power" } = { kind: "power", player: actor, role: power.role, targets: targetsOf(effect) };
  if (as) event.as = as;
  let next: State = state;
  let then: "end" | "secret" | "shown" | "massage" = "end";
  let after: Event[] = [];

  switch (effect.role) {
    case "vendor":
      ledger.move(null, actor, 2);
      ledger.move(null, effect.customer, 1);
      break;
    case "pickpocket":
      event.caught = state.cards[effect.target] === "police";
      if (event.caught) ledger.move(actor, effect.target, 3);
      else ledger.move(effect.target, actor, 2);
      break;
    case "police":
      event.found = state.cards[effect.target] === "pickpocket";
      if (event.found) ledger.move(effect.target, actor, 4);
      next = { ...next, looked: [effect.target] };
      then = "secret";
      break;
    case "seer":
      ledger.move(null, actor, 1);
      next = { ...next, looked: [...effect.targets] };
      then = "secret";
      break;
    case "monk": {
      const by = state.blessings[effect.target] ?? [];
      next = { ...next, blessings: { ...state.blessings, [effect.target]: by.includes(actor) ? by : [...by, actor] } };
      ledger.move(null, actor, 1);
      break;
    }
    case "magician":
      next = { ...next, cards: rotate(state) };
      ledger.move(null, actor, 1);
      break;
    case "collector": {
      const own = ledger.coins[actor] ?? 0;
      for (const p of state.players) if (p !== actor && (ledger.coins[p] ?? 0) > own) ledger.move(p, actor, 1);
      break;
    }
    case "gossip":
      ledger.move(null, actor, 1);
      after = [{ kind: "gossip", target: effect.target, role: state.cards[effect.target] as Role }];
      then = "shown";
      break;
    case "thug":
      ledger.move(effect.target, actor, 1);
      if (!state.muted.includes(effect.target)) next = { ...next, muted: [...state.muted, effect.target] };
      break;
    case "masseur":
      ledger.move(effect.target, actor, 1);
      then = "massage";
      break;
    case "taxi":
      ledger.move(effect.from, effect.to, 2);
      ledger.move(null, actor, 1);
      break;
    default:
      return { ok: false, code: "bad_role" };
  }

  next = settled(ledger, next, event);
  next = { ...next, log: [...next.log, ...after] };
  if (then === "end") return { ok: true, state: endTurn(next) };
  const actorNext = then === "secret" ? actor : targetsOf(effect)[0] as PlayerId;
  return { ok: true, state: { ...next, phase: then, actor: actorNext } };
}

function play(state: State, player: PlayerId, move: Move): MoveResult<State> {
  const wrong: MoveResult<State> = { ok: false, code: "wrong_phase" };
  const myTurn = state.phase === "turn" && state.current === player;
  const acting = state.actor === player;

  switch (move.type) {
    case "hide": {
      if (state.phase !== "memorize" || !state.players.includes(player) || state.hidden.includes(player)) return wrong;
      const hidden = [...state.hidden, player];
      const next = { ...state, hidden };
      const done = state.players.every((p) => hidden.includes(p));
      return { ok: true, state: done ? startTurn(next, state.players[0] as PlayerId) : next };
    }
    case "swap": {
      if (!myTurn) return wrong;
      if (!isTarget(state, player, move.target)) return { ok: false, code: "bad_target" };
      if (isBlessed(state, move.target)) return { ok: false, code: "blessed" };
      const cards = move.real ? { ...state.cards, [player]: state.cards[move.target] as Role, [move.target]: state.cards[player] as Role } : state.cards;
      return { ok: true, state: endTurn({ ...state, cards, log: [...state.log, { kind: "swap", player, target: move.target }] }) };
    }
    case "peek":
      if (!myTurn) return wrong;
      return { ok: true, state: { ...state, phase: "peek", log: [...state.log, { kind: "peek", player }] } };
    case "claim":
      if (!myTurn) return wrong;
      if (state.silenced === player) return { ok: false, code: "muted" };
      if (move.role === "dog" || !state.deck.includes(move.role)) return { ok: false, code: "bad_role" };
      return { ok: true, state: { ...state, phase: "challenge", claim: { player, role: move.role }, answers: {} } };
    case "respond":
      if (state.phase !== "challenge" || !state.claim || state.claim.player === player || !state.players.includes(player)) return wrong;
      return { ok: true, state: settleChallenge({ ...state, answers: { ...state.answers, [player]: move.challenge } }) };
    case "continue":
      if (!acting) return wrong;
      if (state.phase === "shown") return { ok: true, state: endTurn(state) };
      if (state.phase !== "reveal") return wrong;
      if (state.claim && state.cards[player] === state.claim.role) return { ok: true, state: startPower(state, player) };
      return { ok: true, state: endTurn(state) };
    case "power":
      if (state.phase !== "power" || !acting) return wrong;
      return usePower(state, player, move.power);
    case "done":
      if (state.phase === "peek" && state.current === player) return { ok: true, state: endTurn(state) };
      if ((state.phase === "secret" || state.phase === "massage") && acting) return { ok: true, state: endTurn(state) };
      if (state.phase === "power" && acting && state.claim) {
        const skipped: Event = { kind: "power", player, role: state.claim.role, targets: [], skipped: true };
        return { ok: true, state: endTurn({ ...state, log: [...state.log, skipped] }) };
      }
      return wrong;
  }
}

/** Section 6: exactly the cards this viewer may see right now. */
function visibleCards(state: State, viewer: PlayerId | null): Record<PlayerId, Role> {
  const only = (players: readonly PlayerId[]) =>
    Object.fromEntries(players.filter((p) => state.cards[p] !== undefined).map((p) => [p, state.cards[p] as Role]));
  const seated = viewer !== null && state.players.includes(viewer);
  switch (state.phase) {
    case "finished":
      return only(state.players);
    case "memorize":
      return seated && !state.hidden.includes(viewer) ? only(state.players) : {};
    case "peek":
      return viewer === state.current ? only([state.current]) : {};
    case "reveal":
      return only(state.revealed);
    case "secret":
      return viewer !== null && viewer === state.actor ? only(state.looked) : {};
    case "shown":
      return state.actor ? only([state.actor]) : {};
    case "massage":
      return viewer !== null && viewer === state.actor ? only([viewer]) : {};
    default:
      return {};
  }
}

// parseMove helpers: untrusted input, so every field is checked.
function parsePower(raw: unknown, depth = 0): Power | null {
  if (typeof raw !== "object" || raw === null || depth > 1) return null;
  const r = raw as Record<string, unknown>;
  switch (r.role) {
    case "vendor":
      return isId(r.customer) ? { role: "vendor", customer: r.customer } : null;
    case "pickpocket":
    case "police":
    case "monk":
    case "gossip":
    case "thug":
    case "masseur":
      return isId(r.target) ? { role: r.role, target: r.target } : null;
    case "seer": {
      const [first, second, ...rest] = Array.isArray(r.targets) ? (r.targets as unknown[]) : [];
      return isId(first) && isId(second) && rest.length === 0 ? { role: "seer", targets: [first, second] } : null;
    }
    case "magician":
    case "collector":
      return { role: r.role };
    case "taxi":
      return isId(r.from) && isId(r.to) ? { role: "taxi", from: r.from, to: r.to } : null;
    case "medium": {
      const as = parsePower(r.as, depth + 1);
      return as ? { role: "medium", as } : null;
    }
    default:
      return null;
  }
}

export const salabRang: GameDefinition<State, Move, View, Options> = {
  meta,
  defaultOptions: { goal: 15, set: "starter", roles: [] },

  parseOptions(raw) {
    if (typeof raw !== "object" || raw === null) return null;
    const { goal, set, roles = [] } = raw as Record<string, unknown>;
    if (!GOALS.includes(goal as Options["goal"]) || !SETS.includes(set as CardSet)) return null;
    if (!Array.isArray(roles) || !roles.every(isRole)) return null;
    return { goal: goal as Options["goal"], set: set as CardSet, roles: [...new Set(roles)] };
  },

  parseMove(raw) {
    if (typeof raw !== "object" || raw === null) return null;
    const r = raw as Record<string, unknown>;
    switch (r.type) {
      case "hide":
      case "peek":
      case "continue":
      case "done":
        return { type: r.type };
      case "swap":
        return isId(r.target) && typeof r.real === "boolean" ? { type: "swap", target: r.target, real: r.real } : null;
      case "claim":
        return isRole(r.role) ? { type: "claim", role: r.role } : null;
      case "respond":
        return typeof r.challenge === "boolean" ? { type: "respond", challenge: r.challenge } : null;
      case "power": {
        const power = parsePower(r.power);
        return power ? { type: "power", power } : null;
      }
      default:
        return null;
    }
  },

  startError,

  setup({ players, options, random }) {
    const deck = chooseDeck(options, players.length, random);
    const dealt = shuffle(deck, random);
    return {
      phase: "memorize",
      options,
      started: [...players],
      players: [...players],
      out: [],
      deck,
      cards: Object.fromEntries(players.map((p, i) => [p, dealt[i] as Role])),
      coins: Object.fromEntries(players.map((p) => [p, START_COINS])),
      hidden: [],
      round: 1,
      current: players[0] as PlayerId,
      claim: null,
      answers: {},
      actor: null,
      looked: [],
      revealed: [],
      blessings: {},
      muted: [],
      silenced: null,
      log: [],
      reason: null,
    };
  },

  applyMove(state, player, move) {
    if (state.phase === "finished") return { ok: false, code: "wrong_phase" };
    return play(state, player, move);
  },

  activePlayers(state) {
    switch (state.phase) {
      case "memorize":
        return state.players.filter((p) => !state.hidden.includes(p));
      case "turn":
      case "peek":
        return [state.current];
      case "challenge":
        return state.players.filter((p) => p !== state.claim?.player);
      case "finished":
        return [];
      default:
        return state.actor ? [state.actor] : [];
    }
  },

  eliminatedPlayers() {
    return [];
  },

  removePlayer(state, player) {
    if (state.phase === "finished" || !state.players.includes(player)) return state;
    const { [player]: _card, ...cards } = state.cards;
    const { [player]: _answer, ...answers } = state.answers;
    const blessings = Object.fromEntries(
      Object.entries(state.blessings)
        .filter(([blessed]) => blessed !== player)
        .map(([blessed, by]) => [blessed, by.filter((p) => p !== player)] as const)
        .filter(([, by]) => by.length > 0),
    );
    const next: State = {
      ...state,
      players: state.players.filter((p) => p !== player),
      out: [...state.out, player],
      cards,
      answers,
      blessings,
      hidden: state.hidden.filter((p) => p !== player),
      muted: state.muted.filter((p) => p !== player),
      silenced: state.silenced === player ? null : state.silenced,
      looked: state.looked.filter((p) => p !== player),
      revealed: state.revealed.filter((p) => p !== player),
    };
    if (next.players.length < 2) return finish(next, "players");

    switch (state.phase) {
      case "memorize":
        return next.players.every((p) => next.hidden.includes(p)) ? startTurn(next, next.players[0] as PlayerId) : next;
      case "turn":
      case "peek":
        return state.current === player ? endTurn(next) : next;
      case "challenge":
        return state.claim?.player === player ? endTurn(next) : settleChallenge(next);
      default:
        return state.actor === player ? endTurn(next) : next;
    }
  },

  outcome(state): Outcome {
    if (state.phase !== "finished") return { done: false };
    const amounts = [...new Set(state.players.map((p) => state.coins[p] ?? 0))].sort((a, b) => b - a);
    const ranking = amounts.map((n) => state.players.filter((p) => (state.coins[p] ?? 0) === n));
    return { done: true, ranking: state.out.length > 0 ? [...ranking, [...state.out]] : ranking };
  },

  viewFor(state, viewer) {
    const claimer = state.claim?.player;
    return {
      phase: state.phase,
      goal: state.options.goal,
      round: state.round,
      rounds: ROUNDS,
      order: [...state.players],
      deck: [...state.deck],
      coins: Object.fromEntries(state.players.map((p) => [p, state.coins[p] ?? 0])),
      current: state.phase === "finished" || state.phase === "memorize" ? null : state.current,
      actor: state.actor,
      claim: state.claim,
      answered: state.players.filter((p) => p !== claimer && p in state.answers),
      myAnswer: viewer !== null && viewer in state.answers ? (state.answers[viewer] as boolean) : null,
      hidden: [...state.hidden],
      blessed: state.players.filter((p) => isBlessed(state, p)),
      muted: state.players.filter((p) => state.muted.includes(p) || state.silenced === p),
      cards: visibleCards(state, viewer),
      log: state.log,
      reason: state.reason,
    };
  },
};
