export function Toast({ children }: { children: string }) {
  return <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-xl bg-hit px-6 py-3 text-xl font-bold text-ground">{children}</div>;
}
