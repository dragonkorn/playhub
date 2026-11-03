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
      className={`flex flex-col gap-1 rounded-2xl border-3 bg-panel px-6 py-4 text-left ${selected ? "border-signal" : "border-line"}`}
    >
      <span className="flex w-full items-baseline justify-between gap-4">
        <span className="font-display text-4xl font-bold">{title}</span>
        <span className="text-lg text-muted">{meta}</span>
      </span>
      <span className="text-lg text-muted">{description}</span>
    </button>
  );
}
