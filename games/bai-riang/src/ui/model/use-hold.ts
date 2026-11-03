import { useEffect, useRef, useState } from "react";
import { holdDone, holdProgress } from "./hold";

/** N16: fires `onFire` after a full hold. Releasing early, or disabling, cancels. */
export function useHold(onFire: () => void, enabled: boolean) {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const fire = useRef(onFire);
  fire.current = onFire;

  useEffect(() => {
    if (startedAt === null) return;
    let frame = 0;
    const tick = () => {
      const time = performance.now();
      setNow(time);
      if (!holdDone(startedAt, time)) {
        frame = requestAnimationFrame(tick);
        return;
      }
      setStartedAt(null);
      fire.current();
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [startedAt]);

  useEffect(() => {
    if (!enabled) setStartedAt(null);
  }, [enabled]);

  const press = () => {
    if (!enabled) return;
    const time = performance.now();
    setNow(time);
    setStartedAt(time);
  };

  return { holding: startedAt !== null, progress: holdProgress(startedAt, now), press, release: () => setStartedAt(null) };
}
