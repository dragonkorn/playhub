const PATHS = {
  history: ["M12 7v5l3 2"],
  guide: ["M3 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H3z", "M21 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z"],
  sound: ["M11 5 6 9H3v6h3l5 4z", "M15.5 8.5a5 5 0 0 1 0 7", "M18.5 5.5a9 9 0 0 1 0 13"],
  muted: ["M11 5 6 9H3v6h3l5 4z", "M16 9l6 6", "M22 9l-6 6"],
  back: ["M15 5l-7 7 7 7"],
  close: ["M6 6l12 12", "M18 6 6 18"],
  swap: ["M7 4 3 8l4 4", "M3 8h14", "M17 20l4-4-4-4", "M21 16H7"],
  eye: ["M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"],
  hide: ["M3 3l18 18", "M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.9", "M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6"],
  claim: ["M3 10v4h3l7 5V5L6 10z", "M17 8.5a5 5 0 0 1 0 7"],
  check: ["M5 12.5l4.5 4.5L19 7.5"],
  lock: ["M8 11V7a4 4 0 0 1 8 0v4"],
  phone: ["M11 18h2"],
  edit: ["M4 20h4L19 9l-4-4L4 16z", "M13.5 6.5l4 4"],
  spin: ["M20 12a8 8 0 1 1-2.3-5.6", "M20 4v5h-5"],
} as const;

export type IconName = keyof typeof PATHS;

/** Decorative stroke icon: the control around it carries the label. */
export function Icon({ name, size = 20, strokeWidth = 2 }: { name: IconName; size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {name === "history" && <circle cx="12" cy="12" r="9" />}
      {name === "eye" && <circle cx="12" cy="12" r="3" />}
      {name === "lock" && <rect x="5" y="11" width="14" height="10" rx="2" />}
      {name === "phone" && <rect x="7" y="2" width="10" height="20" rx="2" />}
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/** Filled marks on a player chip. */
export function Mark({ name, size = 14 }: { name: "crown" | "shield"; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={name === "crown" ? "fill-sr-coin" : "fill-sr-true"}>
      <path d={name === "crown" ? "M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" : "M12 2l8 3v6c0 5.5-3.5 9-8 11-4.5-2-8-5.5-8-11V5z"} />
    </svg>
  );
}
