export interface GameCardProps {
  title: string;
  meta: string;
  selected: boolean;
  onClick: () => void;
}

/** One game in the home grid (C8). */
export function GameCard({ title, meta, selected, onClick }: GameCardProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`flex h-24 flex-col justify-center gap-0.5 rounded-2xl border-3 bg-panel px-5 text-left tall:h-[68px] tall:px-3.5 ${selected ? "border-signal" : "border-line"}`}
    >
      <span className="truncate font-display text-3xl font-bold tall:text-xl">{title}</span>
      <span className="text-lg text-muted tall:text-sm">{meta}</span>
    </button>
  );
}
