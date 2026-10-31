import type { PointerEvent } from "react";

export interface ShipTileProps {
  name: string;
  art: string;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  onPointerDown: (event: PointerEvent) => void;
}

export function ShipTile({ name, art, selected, disabled, onSelect, onPointerDown }: ShipTileProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      onPointerDown={onPointerDown}
      aria-pressed={selected}
      className={`flex min-h-20 touch-none flex-col justify-center gap-1 rounded-xl border-2 bg-panel p-3 text-left ${selected ? "border-signal" : "border-transparent"}`}
    >
      <span className="text-lg font-medium">{name}</span>
      <img src={art} alt="" draggable={false} className="pointer-events-none h-6 self-start" />
    </button>
  );
}
