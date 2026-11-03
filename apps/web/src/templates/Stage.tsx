import type { Orientation } from "@playhub/game-contract";
import type { ReactNode } from "react";
import { FRAMES } from "../model/frame";

/** Screens are laid out at one fixed frame per orientation, then scaled to fit the viewport (C5, ADR-0007). */
export function Stage({ orientation, viewport, children }: { orientation: Orientation; viewport: { width: number; height: number }; children: ReactNode }) {
  const { width, height } = FRAMES[orientation];
  const scale = Math.min(viewport.width / width, viewport.height / height);

  return (
    <div className="flex h-full items-center justify-center overflow-hidden">
      <div data-frame={orientation} className="relative flex-none" style={{ width, height, transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}
