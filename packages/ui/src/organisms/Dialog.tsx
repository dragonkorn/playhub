import type { ReactNode } from "react";

export interface DialogProps {
  title: string;
  body: string;
  tone?: "plain" | "danger";
  children?: ReactNode;
}

/** Covers its nearest positioned parent. */
export function Dialog({ title, body, tone = "plain", children }: DialogProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-ground/85">
      <div className="flex w-[520px] flex-col gap-4 rounded-2xl border-2 border-line bg-panel p-8">
        <h2 className={`font-display text-5xl leading-tight font-bold ${tone === "danger" ? "text-hit" : ""}`}>{title}</h2>
        <p className="text-xl text-muted">{body}</p>
        {children}
      </div>
    </div>
  );
}
