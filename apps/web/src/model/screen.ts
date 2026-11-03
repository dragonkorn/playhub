import type { Orientation } from "@playhub/game-contract";
import { createContext, useContext, useEffect, useState } from "react";
import { BOTH } from "./frame";

/** Lets the current screen tell the stage which orientations it lays out for (C5). */
export const ScreenContext = createContext<(allowed: readonly Orientation[]) => void>(() => {});

export function useScreenOrientations(allowed: readonly Orientation[]) {
  const set = useContext(ScreenContext);
  // The key stands for the array, which callers rebuild every render.
  const key = allowed.join();
  useEffect(() => {
    set(key.split(",") as Orientation[]);
    return () => set(BOTH);
  }, [set, key]);
}

export function useViewport() {
  const read = () => ({ width: innerWidth, height: innerHeight });
  const [viewport, setViewport] = useState(read);
  useEffect(() => {
    const update = () => setViewport(read());
    addEventListener("resize", update);
    return () => removeEventListener("resize", update);
  }, []);
  return viewport;
}
