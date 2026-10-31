export function GameCard({ title, meta, description }: { title: string; meta: string; description: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border-3 border-signal bg-panel p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-display text-4xl font-bold">{title}</h3>
        <span className="text-lg text-muted">{meta}</span>
      </div>
      <p className="text-lg text-muted">{description}</p>
    </div>
  );
}
