export function ResultBanner({ text }: { text: string }) {
  return (
    <div className="fir-banner pointer-events-none absolute top-1/2 left-1/2 rounded-3xl border-4 border-signal bg-ground/90 px-14 py-8 font-display text-8xl font-extrabold whitespace-nowrap text-signal">
      {text}
    </div>
  );
}
