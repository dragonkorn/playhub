export interface OptionCardProps {
  title: string;
  hint: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export function OptionCard({ title, hint, selected, disabled, onClick }: OptionCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={onClick}
      className={`flex h-20 flex-col items-center justify-center rounded-xl border-2 px-2 ${selected ? "border-signal bg-signal text-ground" : "border-line bg-panel"}`}
    >
      <span className="text-xl font-bold">{title}</span>
      <span className="text-base">{hint}</span>
    </button>
  );
}
