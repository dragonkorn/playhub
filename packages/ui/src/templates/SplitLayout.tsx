import type { ReactNode } from "react";

export interface SplitLayoutProps {
  header?: ReactNode;
  left: ReactNode;
  right: ReactNode;
  /** Centers both columns vertically. */
  centered?: boolean;
  leftClassName?: string;
  rightClassName?: string;
}

export function SplitLayout({ header, left, right, centered, leftClassName = "", rightClassName = "" }: SplitLayoutProps) {
  // The portrait frame stacks the two columns (C5).
  const columns = `grid min-h-0 grow grid-cols-2 ${header ? "gap-10" : "gap-14"} ${centered ? "items-center" : ""} tall:flex tall:flex-col tall:items-stretch tall:gap-4`;
  return (
    <main className={`flex h-full flex-col ${header ? "gap-6 px-14 pt-8 pb-10" : "p-14"} tall:gap-4 tall:p-4`}>
      {header}
      <div className={columns}>
        <section className={leftClassName}>{left}</section>
        <section className={rightClassName}>{right}</section>
      </div>
    </main>
  );
}
