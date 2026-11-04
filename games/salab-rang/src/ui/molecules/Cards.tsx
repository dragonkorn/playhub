import type { ReactNode } from "react";
import type { Role } from "../../logic/types";
import { RoleIcon } from "../atoms/RoleIcon";

export type CardSize = "xl" | "lg" | "md" | "sm";
export type CardTone = "lantern" | "true" | "false";

const SIZES: Record<CardSize, { box: string; emblem: string; icon: number; name: string }> = {
  xl: { box: "h-[420px] w-[300px] gap-3.5 rounded-[26px] border-[6px] p-6", emblem: "size-[150px]", icon: 84, name: "text-5xl" },
  lg: { box: "h-[420px] w-[300px] gap-3 rounded-[26px] border-[5px] p-6 tall:h-[336px] tall:w-[240px] tall:gap-2.5 tall:rounded-[22px] tall:border-4 tall:p-5", emblem: "size-[150px] tall:size-[116px]", icon: 64, name: "text-5xl tall:text-[40px]" },
  md: { box: "h-[336px] w-[240px] gap-2.5 rounded-[22px] border-4 p-5 tall:h-[280px] tall:w-[200px] tall:p-4", emblem: "size-[116px] tall:size-[92px]", icon: 56, name: "text-4xl tall:text-3xl" },
  sm: { box: "h-[224px] w-[160px] gap-2 rounded-[18px] border-4 p-3", emblem: "size-[84px]", icon: 46, name: "text-2xl" },
};

const TONES: Record<CardTone, string> = {
  lantern: "border-sr-lantern",
  true: "border-sr-true",
  false: "border-sr-false",
};

export interface CardFaceProps {
  role: Role;
  /** The role's name, already translated. */
  name: string;
  /** Small line above the emblem. */
  caption?: string;
  /** Text below the name: the power, or whose card it is. */
  detail?: ReactNode;
  label: string;
  size?: CardSize;
  tone?: CardTone;
}

export function CardFace({ role, name, caption, detail, label, size = "lg", tone = "lantern" }: CardFaceProps) {
  const s = SIZES[size];
  return (
    <article aria-label={label} className={`flex flex-none flex-col items-center justify-center bg-sr-card text-center text-sr-ink ${s.box} ${TONES[tone]}`}>
      {caption && <span className="text-[13px] font-bold text-sr-ink-soft">{caption}</span>}
      <span className={`flex flex-none items-center justify-center rounded-full bg-sr-back text-sr-coin ${s.emblem}`}>
        <RoleIcon role={role} size={s.icon} />
      </span>
      <h2 className={`m-0 font-display leading-tight font-black ${s.name}`}>{name}</h2>
      {detail && <div className="text-[15px] leading-snug">{detail}</div>}
    </article>
  );
}

const BACK_SIZES: Record<CardSize, string> = {
  xl: "h-[420px] w-[300px] rounded-[26px] border-[5px]",
  lg: "h-[420px] w-[300px] rounded-[26px] border-[5px] tall:h-[336px] tall:w-[240px] tall:rounded-[22px] tall:border-4",
  md: "h-[336px] w-[240px] rounded-[22px] border-4 tall:h-[280px] tall:w-[200px] tall:rounded-[20px]",
  sm: "h-[156px] w-[112px] rounded-[14px] border-[3px]",
};

/** A face-down card: the pattern is a night-market lantern lattice. */
export function CardBack({ label, size = "md", tone = "lantern", mark = "?" }: { label: string; size?: CardSize; tone?: "lantern" | "true"; mark?: string }) {
  const color = tone === "true" ? "border-sr-true text-sr-true" : "border-sr-lantern text-sr-lantern";
  return (
    <div role="img" aria-label={label} className={`sr-lattice flex flex-none items-center justify-center bg-sr-back ${BACK_SIZES[size]} ${color}`}>
      <span className={`flex aspect-square w-1/2 flex-col items-center justify-center rounded-full border-[3px] bg-sr-night ${color}`}>
        <span className="font-display text-5xl leading-none font-black">{mark}</span>
      </span>
    </div>
  );
}
