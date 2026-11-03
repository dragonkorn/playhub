/** A revealed number with its owner. A skipped one is struck through in the mistake color (N7). */
export function RevealTile({ card, name, skipped = false, size = "md" }: { card: number; name: string; skipped?: boolean; size?: "md" | "lg" }) {
  const box = size === "lg" ? "h-24 w-24 rounded-2xl" : "h-15 w-15 rounded-xl";
  const style = skipped ? "border-3 border-dashed border-hit text-hit" : "bg-text text-ground";
  return (
    <div className={`flex flex-none flex-col items-center justify-center leading-tight ${box} ${style}`}>
      <span className={`font-display font-extrabold ${size === "lg" ? "text-4xl" : "text-2xl"} ${skipped ? "line-through" : ""}`}>{card}</span>
      <span className="max-w-full truncate px-1 text-xs font-bold">{name}</span>
    </div>
  );
}
