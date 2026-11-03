import type { SlotState } from "../model/feedback";
import { Icon } from "../atoms/Icon";

const STYLES: Record<SlotState, string> = {
  next: "border-3 border-signal",
  waiting: "border-2 border-line",
  revealed: "bg-panel text-muted",
  skipped: "bg-panel text-muted",
};

/** One number in the hand strip (N15). `label` names a revealed or skipped number for screen readers. */
export function HandSlot({ card, state, label }: { card: number; state: SlotState; label?: string }) {
  const out = state === "revealed" || state === "skipped";
  return (
    <li aria-label={label} className={`flex h-18 items-center justify-center gap-1.5 rounded-2xl tall:h-15 ${STYLES[state]}`}>
      {state === "revealed" && <Icon name="check" size={20} />}
      <span className={`font-display text-3xl font-extrabold ${out ? "font-bold line-through" : ""}`}>{card}</span>
    </li>
  );
}
