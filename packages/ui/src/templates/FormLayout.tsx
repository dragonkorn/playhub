import type { ReactNode } from "react";

export function FormLayout({ back, title, children }: { back: ReactNode; title: string; children: ReactNode }) {
  return (
    <main className="flex h-full flex-col gap-6 px-14 pt-10 pb-14">
      <div className="self-start">{back}</div>
      <section className="flex w-[560px] flex-col gap-7 self-center">
        <h1 className="text-center font-display text-7xl font-bold">{title}</h1>
        {children}
      </section>
    </main>
  );
}
