import { useState, type ReactNode } from "react";

export interface ActionTileProps {
  icon: ReactNode;
  title: string;
  hint: string;
  disabled?: boolean;
  onClick: () => void;
}

/** One of the three turn actions (W11 to W13). */
export function ActionTile({ icon, title, hint, disabled, onClick }: ActionTileProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex min-h-[132px] grow basis-0 items-center gap-5 rounded-2xl border-2 border-sr-lantern bg-sr-raised px-6 text-left text-sr-text disabled:border-dashed disabled:border-sr-line disabled:bg-transparent disabled:text-sr-muted tall:flex-col tall:justify-center tall:gap-1.5 tall:px-1.5 tall:text-center"
    >
      <span className="text-sr-lantern">{icon}</span>
      <span className="flex flex-col gap-0.5">
        <span className="font-display text-[28px] leading-none font-bold tall:text-[22px]">{title}</span>
        <span className="text-base leading-snug text-sr-soft tall:text-[13px]">{hint}</span>
      </span>
    </button>
  );
}

export interface HoldButtonProps {
  label: string;
  holdingLabel: string;
  icon: ReactNode;
  tone?: "lantern" | "true";
  onHoldChange: (holding: boolean) => void;
}

/** W34: shows something only while a finger or key is down. */
export function HoldButton({ label, holdingLabel, icon, tone = "lantern", onHoldChange }: HoldButtonProps) {
  const [holding, setHolding] = useState(false);
  const set = (value: boolean) => {
    setHolding(value);
    onHoldChange(value);
  };
  const colors = tone === "true" ? "border-sr-true bg-sr-true-deep text-sr-text" : "border-sr-lantern bg-sr-stall text-sr-glow";
  return (
    <button
      type="button"
      aria-pressed={holding}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture?.(e.pointerId);
        set(true);
      }}
      onPointerUp={() => set(false)}
      onPointerCancel={() => set(false)}
      onLostPointerCapture={() => holding && set(false)}
      onKeyDown={(e) => (e.key === " " || e.key === "Enter") && !e.repeat && set(true)}
      onKeyUp={(e) => (e.key === " " || e.key === "Enter") && set(false)}
      onContextMenu={(e) => e.preventDefault()}
      className={`flex h-[72px] w-full flex-none touch-none items-center justify-center gap-2.5 rounded-2xl border-[3px] font-display text-xl font-bold select-none tall:h-16 tall:text-lg ${colors}`}
    >
      {icon}
      {holding ? holdingLabel : label}
    </button>
  );
}

export interface SheetFrameProps {
  title: string;
  hint?: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
}

/** W39: a sheet over the board, from the side on iPad and from below on a phone. */
export function SheetFrame({ title, hint, closeLabel, onClose, children }: SheetFrameProps) {
  return (
    <div className="absolute inset-0 z-30 flex justify-end bg-sr-shade/70 tall:flex-col tall:pt-10" onClick={onClose}>
      <section
        role="dialog"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="sr-sheet flex h-full w-[460px] flex-col gap-3 bg-sr-panel p-5 tall:h-auto tall:min-h-0 tall:w-full tall:grow tall:rounded-t-3xl tall:px-4 tall:pt-2.5"
      >
        <span aria-hidden="true" className="hidden h-[5px] w-11 self-center rounded-full bg-sr-line tall:block" />
        <header className="flex h-11 flex-none items-center">
          <h2 className="m-0 grow font-display text-2xl font-bold">{title}</h2>
          <button type="button" aria-label={closeLabel} onClick={onClose} className="flex size-11 items-center justify-center rounded-lg border-2 border-sr-line">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12" />
              <path d="M18 6 6 18" />
            </svg>
          </button>
        </header>
        {hint && <p className="m-0 text-sm text-sr-muted">{hint}</p>}
        <div className="flex min-h-0 grow flex-col gap-1.5 overflow-y-auto">{children}</div>
      </section>
    </div>
  );
}
