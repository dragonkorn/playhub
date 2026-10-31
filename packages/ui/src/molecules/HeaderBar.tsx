import type { ReactNode } from "react";

const TONES = {
  turn: "rounded-xl bg-signal px-5 text-ground",
  panel: "rounded-xl bg-panel px-5",
  plain: "",
};

export interface HeaderBarProps {
  title: string;
  detail?: string;
  tone?: keyof typeof TONES;
  action?: ReactNode;
}

export function HeaderBar({ title, detail, tone = "plain", action }: HeaderBarProps) {
  return (
    <header className={`flex h-16 flex-none items-center justify-between gap-6 ${TONES[tone]}`}>
      <h1 className="truncate font-display text-4xl font-bold">{title}</h1>
      <div className="flex flex-none items-center gap-4">
        {detail && <p className={`text-lg font-medium ${tone === "turn" ? "" : "text-muted"}`}>{detail}</p>}
        {action}
      </div>
    </header>
  );
}
