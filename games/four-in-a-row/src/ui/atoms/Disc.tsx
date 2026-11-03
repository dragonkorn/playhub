import type { CSSProperties } from "react";

export type DiscColor = "yellow" | "red";

const FILL: Record<DiscColor, string> = { yellow: "bg-signal", red: "bg-hit" };

export interface DiscProps {
  color: DiscColor;
  size: number;
  /** Accessible name. Leave out for a disc that is only decoration. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

/** Colors also differ by an inner mark, a ring or a dot (F16). Callers set the position. */
export function Disc({ color, size, label, className = "", style }: DiscProps) {
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`grid flex-none place-items-center rounded-full ${FILL[color]} ${className}`}
      style={{ width: size, height: size, ...style }}
    >
      {color === "yellow" ? (
        <span className="h-[56%] w-[56%] rounded-full border-[3px] border-ground/35" />
      ) : (
        <span className="h-[28%] w-[28%] rounded-full bg-ground/35" />
      )}
    </span>
  );
}
