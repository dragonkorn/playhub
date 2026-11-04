import type { PlayerId } from "@playhub/game-contract";
import { NOT_CHANNELED } from "./meta";
import type { Move, Power, Role, State } from "./types";

const pick = <T>(items: readonly T[], random: () => number): T => items[Math.floor(random() * items.length)] as T;

/** Two different players other than `actor`, or null when there aren't two. */
function twoOthers(state: State, actor: PlayerId, random: () => number): [PlayerId, PlayerId] | null {
  const others = state.players.filter((p) => p !== actor);
  if (others.length < 2) return null;
  const first = pick(others, random);
  return [first, pick(others.filter((p) => p !== first), random)];
}

/** A legal power for `role`, or null when it has no legal target. */
function randomPower(state: State, actor: PlayerId, role: Role, random: () => number): Power | null {
  const others = state.players.filter((p) => p !== actor);
  if (others.length === 0) return null;
  const target = pick(others, random);
  switch (role) {
    case "vendor":
      return { role, customer: target };
    case "seer": {
      const pair = twoOthers(state, actor, random);
      return pair && { role, targets: pair };
    }
    case "taxi": {
      const pair = twoOthers(state, actor, random);
      return pair && { role, from: pair[0], to: pair[1] };
    }
    case "magician":
    case "collector":
      return { role };
    case "medium": {
      const channel = state.deck.filter((r) => !NOT_CHANNELED.includes(r));
      const inner = channel.length > 0 ? randomPower(state, actor, pick(channel, random), random) : null;
      return inner && { role, as: inner };
    }
    case "dog":
      return null;
    default:
      return { role, target };
  }
}

/** A legal move for an active player, used by the platform test kit. */
export function randomMove(state: State, player: PlayerId, random: () => number): Move {
  switch (state.phase) {
    case "memorize":
      return { type: "hide" };
    case "turn": {
      const swappable = state.players.filter((p) => p !== player && !(state.blessings[p]?.length));
      const claimable = state.deck.filter((r) => r !== "dog");
      const roll = random();
      if (roll < 0.4 && swappable.length > 0) return { type: "swap", target: pick(swappable, random), real: random() < 0.5 };
      if (roll < 0.6 || state.silenced === player) return { type: "peek" };
      return { type: "claim", role: pick(claimable, random) };
    }
    case "challenge":
      return { type: "respond", challenge: random() < 0.3 };
    case "reveal":
    case "shown":
      return { type: "continue" };
    case "power": {
      const power = state.claim && randomPower(state, player, state.claim.role, random);
      return power ? { type: "power", power } : { type: "done" };
    }
    default:
      return { type: "done" };
  }
}

/** Section 6: hidden cards, a swap's outcome, and other players' answers. */
export function secrets(state: State, viewer: PlayerId): string[] {
  const visible = new Set(Object.keys(visibleCards(state, viewer)));
  const cards = Object.entries(state.cards)
    .filter(([p]) => !visible.has(p))
    .map(([p, role]) => `"${p}":"${role}"`);
  const answers = Object.entries(state.answers)
    .filter(([p]) => p !== viewer)
    .map(([p, answer]) => `"${p}":${answer}`);
  return [...cards, ...answers, '"real"'];
}

/** Mirrors section 6 independently of `viewFor`, so the kit checks it. */
function visibleCards(state: State, viewer: PlayerId): Record<PlayerId, Role> {
  const only = (players: readonly PlayerId[]) =>
    Object.fromEntries(players.filter((p) => state.cards[p]).map((p) => [p, state.cards[p] as Role]));
  switch (state.phase) {
    case "finished":
      return only(state.players);
    case "memorize":
      return state.hidden.includes(viewer) ? {} : only(state.players);
    case "peek":
      return viewer === state.current ? only([viewer]) : {};
    case "reveal":
      return only(state.revealed);
    case "secret":
      return viewer === state.actor ? only(state.looked) : {};
    case "shown":
      return state.actor ? only([state.actor]) : {};
    case "massage":
      return viewer === state.actor ? only([viewer]) : {};
    default:
      return {};
  }
}
