import type { PlayerId } from "@playhub/game-contract";
import { useLogPlayback } from "@playhub/ui";
import type { Drop, View } from "../../logic/types";
import { stagesFor, type Stage } from "./playback";
import { sounds } from "./sounds";

export interface Playback {
  /** How many drops have landed on this screen. */
  revealed: number;
  drop: Drop | null;
  stage: Stage | null;
  playing: boolean;
}

/** Plays new drops one at a time, in log order (F18, F19). */
/** In local play every seat shares the device, so a win always plays the win sound (F24). */
export function usePlayback(view: View, me: PlayerId, local: boolean, online: boolean, speed: number): Playback {
  const { item, ...playback } = useLogPlayback({
    items: view.drops,
    online,
    speed,
    stagesFor: (_, index) => stagesFor(view, index),
    revealAfter: "fall",
    onStage: (stage, drop) => {
      if (stage === "land") sounds.play("land");
      if (stage === "draw") sounds.play("draw");
      if (stage === "win") sounds.play(!local && view.order.includes(me) && drop.player !== me ? "lose" : "win");
    },
  });
  return { ...playback, drop: item };
}
