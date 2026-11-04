export function Coin({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="flex-none">
      <circle cx="12" cy="12" r="10" className="fill-sr-coin" />
      <circle cx="12" cy="12" r="5.5" fill="none" strokeWidth="2.5" className="stroke-sr-coin-edge" />
    </svg>
  );
}
