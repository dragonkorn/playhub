export type Status = "online" | "reconnecting" | "lost";

const STYLES: Record<Status, string> = {
  online: "border-online bg-online",
  reconnecting: "border-signal bg-transparent",
  lost: "border-hit bg-hit",
};

export function StatusDot({ status, label }: { status: Status; label: string }) {
  return <span role="img" aria-label={label} className={`h-3 w-3 flex-none rounded-full border-2 ${STYLES[status]}`} />;
}
