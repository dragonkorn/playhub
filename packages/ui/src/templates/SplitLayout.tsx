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
  const columns = `grid min-h-0 grow grid-cols-2 ${header ? "gap-10" : "gap-14"} ${centered ? "items-center" : ""}`;
  return (
    <main className={`flex h-full flex-col ${header ? "gap-6 px-14 pt-8 pb-10" : "p-14"}`}>
      {header}
      <div className={columns}>
        <section className={leftClassName}>{left}</section>
        <section className={rightClassName}>{right}</section>
      </div>
    </main>
  );
}
