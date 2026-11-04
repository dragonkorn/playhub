import type { Role } from "../../logic/types";

const HAND = [
  "M8 13V5a1.5 1.5 0 0 1 3 0v6",
  "M11 11V4a1.5 1.5 0 0 1 3 0v7",
  "M14 11V5.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7L3 14a1.6 1.6 0 0 1 2.6-1.8L8 15",
];
const SHIELD = "M12 2l8 3v6c0 5.5-3.5 9-8 11-4.5-2-8-5.5-8-11V5z";
const LOTUS = ["M12 20c-4 0-8-3-8-7 3 0 6 2 8 5 2-3 5-5 8-5 0 4-4 7-8 7z", "M12 18c-2-3-2-8 0-12 2 4 2 9 0 12z"];

const STROKES: Record<Exclude<Role, "dog">, readonly string[]> = {
  vendor: ["M3 11h18a9 9 0 0 1-18 0z", "M8 8c0-1.5 1-2 1-3.5", "M12 8c0-1.5 1-2 1-3.5", "M16 8c0-1.5 1-2 1-3.5"],
  pickpocket: HAND,
  police: [SHIELD, "M12 8l1.2 2.5 2.8.4-2 2 .5 2.8L12 14.4l-2.5 1.3.5-2.8-2-2 2.8-.4z"],
  seer: ["M9 8a3 3 0 0 1 3-3", "M7 16.5 5.5 21h13L17 16.5"],
  monk: LOTUS,
  magician: ["M7 10h10", "M3 19h18"],
  collector: ["M6 3h12v18l-3-2-3 2-3-2-3 2z", "M9 8h6", "M9 12h6"],
  medium: ["M12 3v4", "M12 17v4", "M3 12h4", "M17 12h4", "M6 6l2.5 2.5", "M15.5 15.5 18 18", "M6 18l2.5-2.5", "M15.5 8.5 18 6"],
  gossip: ["M4 5h16v11H9l-5 4z", "M8 9h8", "M8 12h5"],
  thug: ["M8 11V7a4 4 0 0 1 8 0v4", "M9 16h6"],
  masseur: ["M5 19c0-8 6-14 14-14 0 8-6 14-14 14z", "M5 19 13 11"],
  taxi: ["M5.5 17l4-7h5l4 7", "M14 10l-1.5-4H10"],
};

/** Decorative character emblem; the card around it names the role. */
export function RoleIcon({ role, size = 64 }: { role: Role; size?: number }) {
  if (role === "dog") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <ellipse cx="6" cy="10" rx="2" ry="2.6" />
        <ellipse cx="10" cy="6" rx="2" ry="2.6" />
        <ellipse cx="14" cy="6" rx="2" ry="2.6" />
        <ellipse cx="18" cy="10" rx="2" ry="2.6" />
        <path d="M12 11c3 0 5.5 3.5 5.5 6a2.5 2.5 0 0 1-2.5 2.5c-1.2 0-1.8-.6-3-.6s-1.8.6-3 .6A2.5 2.5 0 0 1 6.5 17c0-2.5 2.5-6 5.5-6z" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {role === "seer" && <circle cx="12" cy="10" r="7" />}
      {role === "magician" && <rect x="7" y="5" width="10" height="12" rx="1" />}
      {role === "thug" && <rect x="5" y="11" width="14" height="10" rx="2" />}
      {role === "taxi" && (
        <>
          <circle cx="5.5" cy="17" r="3" />
          <circle cx="18.5" cy="17" r="3" />
        </>
      )}
      {STROKES[role].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
