import { useEffect, useState, type ReactNode } from "react";

const WIDTH = 1180;
const HEIGHT = 820;

/** Screens are laid out at one iPad size, then scaled to fit any device. */
export function Stage({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const fit = () => setScale(Math.min(innerWidth / WIDTH, innerHeight / HEIGHT));
    fit();
    addEventListener("resize", fit);
    return () => removeEventListener("resize", fit);
  }, []);

  return (
    <div className="flex h-full items-center justify-center overflow-hidden">
      <div className="relative flex-none" style={{ width: WIDTH, height: HEIGHT, transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}
