import { Heart } from "../atoms/Icon";

export function Lives({ lives, total, label, size = 20 }: { lives: number; total: number; label: string; size?: number }) {
  return (
    <span role="img" aria-label={label} className="flex gap-0.5">
      {Array.from({ length: total }, (_, i) => (
        <Heart key={i} filled={i < lives} size={size} />
      ))}
    </span>
  );
}
