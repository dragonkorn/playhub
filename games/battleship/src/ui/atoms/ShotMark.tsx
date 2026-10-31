import type { Shot } from "../../logic/types";

export function ShotMark({ result }: { result: Shot["result"] }) {
  if (result === "miss") return <span className="rounded-full bg-muted" style={{ width: "26%", height: "26%" }} />;
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[62%] w-[62%]" fill="none" stroke="var(--color-ground)" strokeWidth="4" strokeLinecap="round">
      <path d="M5 5l14 14M19 5L5 19" />
    </svg>
  );
}
