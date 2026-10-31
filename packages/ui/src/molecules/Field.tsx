import type { ReactNode } from "react";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2 text-lg font-bold text-muted">
      {label}
      {children}
    </label>
  );
}
