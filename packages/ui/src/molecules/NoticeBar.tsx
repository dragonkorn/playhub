export function NoticeBar({ children, position = "top" }: { children: string; position?: "top" | "bottom" }) {
  const style = position === "top" ? "top-0 bg-signal py-1 font-bold text-ground" : "bottom-0 bg-panel p-3 text-muted";
  return <div className={`absolute inset-x-0 text-center text-xl ${style}`}>{children}</div>;
}
