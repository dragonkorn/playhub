const PATHS = {
  people: ["M2.5 20a6.5 6.5 0 0 1 13 0", "M16 4.5a3.5 3.5 0 0 1 0 7", "M18 14a6.5 6.5 0 0 1 3.5 6"],
  sound: ["M11 5 6 9H3v6h3l5 4z", "M15.5 8.5a5 5 0 0 1 0 7", "M18.5 5.5a9 9 0 0 1 0 13"],
  muted: ["M11 5 6 9H3v6h3l5 4z", "M16 9l6 6", "M22 9l-6 6"],
  hide: ["M3 3l18 18", "M10.6 5.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 3.9", "M6.6 6.6C3.8 8.4 2 12 2 12s4 7 10 7a9.7 9.7 0 0 0 5.4-1.6", "M9.9 9.9a3 3 0 0 0 4.2 4.2"],
  reroll: ["M21 12a9 9 0 1 1-3-6.7", "M21 4v5h-5"],
  close: ["M6 6l12 12", "M18 6 6 18"],
  check: ["M5 12.5l4.5 4.5L19 7.5"],
} as const;

export type IconName = keyof typeof PATHS;

/** Decorative stroke icon: the control around it carries the label. */
export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {name === "people" && <circle cx="9" cy="8" r="3.5" />}
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

const HEART = "M12 21s-7-4.4-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.6-9.5 9-9.5 9z";

export function Heart({ filled, size = 20 }: { filled: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d={HEART} className={filled ? "fill-hit" : "fill-none stroke-muted"} strokeWidth={filled ? 0 : 2} />
    </svg>
  );
}
