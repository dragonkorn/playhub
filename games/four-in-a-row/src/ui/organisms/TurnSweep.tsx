export function TurnSweep({ text }: { text: string }) {
  return (
    <div className="fir-sweep pointer-events-none absolute inset-x-0 top-[330px] flex h-[150px] items-center justify-center bg-signal font-display text-8xl font-extrabold whitespace-nowrap text-ground">
      {text}
    </div>
  );
}
