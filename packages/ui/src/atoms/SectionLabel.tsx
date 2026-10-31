import type { ReactNode } from "react";

export function SectionLabel({ children }: { children: ReactNode }) {
  return <h2 className="mb-1 text-lg font-bold text-muted">{children}</h2>;
}
