import type { PlayerId } from "@playhub/game-contract";
import { useEffect, useRef, useState } from "react";
import type { View } from "../../logic/types";
import { MISTAKE_MS, feedbackFor, type Feedback } from "./feedback";
import { sounds } from "./sounds";

type Mistake = Extract<Feedback, { kind: "mistake" }>;

/** How long the last reveal stays on screen before the result. */
const END_MS = 1200;

/** N21, N22: sounds and the mistake banner for each new view. The result waits for both. */
export function usePlayback(view: View, me: PlayerId, holding: boolean, release: () => void) {
  const previous = useRef<View | null>(null);
  const [mistake, setMistake] = useState<Mistake | null>(null);
  const [ending, setEnding] = useState<"won" | "lost" | null>(null);

  useEffect(() => {
    const events = feedbackFor(previous.current, view, me);
    previous.current = view;
    for (const event of events) {
      if (event.kind === "reveal") sounds.play("reveal");
      if (event.kind === "mistake") {
        sounds.play("mistake");
        setMistake(event);
      }
      if (event.kind === "clear") sounds.play("clear");
      if (event.kind === "won" || event.kind === "lost") setEnding(event.kind);
    }
  }, [view, me]);

  useEffect(() => {
    if (!mistake) return;
    const timer = setTimeout(() => setMistake(null), MISTAKE_MS);
    return () => clearTimeout(timer);
  }, [mistake]);

  useEffect(() => {
    if (!holding || mistake) return;
    if (!ending) return release();
    sounds.play(ending === "won" ? "win" : "lose");
    const timer = setTimeout(release, END_MS);
    return () => clearTimeout(timer);
  }, [holding, mistake, ending, release]);

  return { mistake };
}
