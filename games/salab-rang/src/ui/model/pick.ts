import type { PlayerId } from "@playhub/game-contract";
import type { Power, Role } from "../../logic/types";

export type Need = "one" | "two" | "fromTo" | "none";

/** W18: what a power needs picked on the strip. */
export function needOf(role: Role): Need {
  switch (role) {
    case "seer":
      return "two";
    case "taxi":
      return "fromTo";
    case "magician":
    case "collector":
    case "dog":
    case "medium":
      return "none";
    default:
      return "one";
  }
}

export interface Pick {
  role: Role;
  /** The role the medium channels, chosen first (W20). */
  as: Role | null;
  targets: PlayerId[];
}

export const emptyPick = (role: Role, as: Role | null = null): Pick => ({ role, as, targets: [] });

/** The role whose targets are being picked. */
export const effectiveRole = (pick: Pick): Role | null => (pick.role === "medium" ? pick.as : pick.role);

/** W33: a tap on a chip. */
export function tap(pick: Pick, player: PlayerId): Pick {
  const role = effectiveRole(pick);
  if (role === null) return pick;
  const { targets } = pick;
  switch (needOf(role)) {
    case "one":
      return { ...pick, targets: [player] };
    case "two":
      if (targets.includes(player)) return { ...pick, targets: targets.filter((p) => p !== player) };
      return { ...pick, targets: [...targets, player].slice(-2) };
    case "fromTo":
      if (targets.length === 1 && targets[0] !== player) return { ...pick, targets: [targets[0] as PlayerId, player] };
      return { ...pick, targets: [player] };
    default:
      return pick;
  }
}

function effect(role: Role, targets: readonly PlayerId[]): Power | null {
  const [first, second] = targets;
  switch (needOf(role)) {
    case "none":
      return role === "magician" || role === "collector" ? { role } : null;
    case "two":
      return first && second ? { role: "seer", targets: [first, second] } : null;
    case "fromTo":
      return first && second ? { role: "taxi", from: first, to: second } : null;
    default:
      if (!first) return null;
      return role === "vendor" ? { role, customer: first } : ({ role, target: first } as Power);
  }
}

/** The finished power, or null while picks are missing. */
export function powerOf(pick: Pick): Power | null {
  if (pick.role !== "medium") return effect(pick.role, pick.targets);
  if (pick.as === null) return null;
  const as = effect(pick.as, pick.targets);
  return as && { role: "medium", as };
}

export const isComplete = (pick: Pick) => powerOf(pick) !== null;
