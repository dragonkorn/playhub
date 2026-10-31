import type { ReactNode } from "react";
import { StatusDot, type Status } from "../atoms/StatusDot";

const SIZES = {
  sm: "h-11 rounded-lg px-3.5 text-lg font-medium",
  md: "h-13 rounded-xl px-3.5 text-xl font-medium",
  lg: "h-14 flex-none rounded-xl border-3 px-3 text-xl font-bold",
};

export interface PlayerRowProps {
  name: string;
  dot?: { status: Status; label: string };
  trailing?: ReactNode;
  /** A control beside the row's content, such as remove. */
  action?: ReactNode;
  size?: keyof typeof SIZES;
  selected?: boolean;
  highlighted?: boolean;
  dimmed?: boolean;
  /** Makes the whole row a button. */
  onClick?: () => void;
  disabled?: boolean;
}

export function PlayerRow({ name, dot, trailing, action, size = "md", selected, highlighted, dimmed, onClick, disabled }: PlayerRowProps) {
  const border = size !== "lg" ? "" : highlighted ? "border-signal" : "border-transparent";
  const className = `flex w-full items-center gap-2.5 text-left ${SIZES[size]} ${selected ? "bg-line" : "bg-panel"} ${border} ${dimmed ? "text-muted" : ""}`;
  const content = (
    <>
      {dot && <StatusDot status={dot.status} label={dot.label} />}
      <span className="grow truncate">{name}</span>
      {trailing && <span className="flex-none text-base font-normal text-muted">{trailing}</span>}
      {action}
    </>
  );
  if (!onClick) return <div className={className}>{content}</div>;
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={selected} className={className}>
      {content}
    </button>
  );
}
