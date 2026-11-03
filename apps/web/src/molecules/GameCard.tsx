export interface GameCardProps {
  title: string;
  meta: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}

export function GameCard({ title, meta, description, selected, onClick }: GameCardProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`flex flex-col gap-1 rounded-2xl border-3 bg-panel px-6 py-4 text-left tall:gap-0 tall:px-4 tall:py-2.5 ${selected ? "border-signal" : "border-line"}`}
    >
      <span className="flex w-full items-baseline justify-between gap-4">
        <span className="font-display text-4xl font-bold tall:text-2xl">{title}</span>
        <span className="text-lg text-muted tall:text-sm">{meta}</span>
      </span>
      <span className="text-lg text-muted tall:text-sm">{description}</span>
    </button>
  );
}
