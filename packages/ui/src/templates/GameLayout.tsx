import type { ReactNode } from "react";

export interface GameLayoutProps {
  header: ReactNode;
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  className?: string;
  /** Overlays drawn on top of the layout. */
  children?: ReactNode;
}

export function GameLayout({ header, left, center, right, className = "", children }: GameLayoutProps) {
  return (
    <main className={`relative flex h-full flex-col gap-4 overflow-hidden p-6 ${className}`}>
      {header}
      <div className="grid min-h-0 grow grid-cols-[250px_584px_250px] justify-between">
        <section className="flex min-h-0 flex-col gap-1.5">{left}</section>
        <section className="flex flex-col gap-3">{center}</section>
        <section className="flex min-h-0 flex-col gap-2.5">{right}</section>
      </div>
      {children}
    </main>
  );
}
