import { createSoundPlayer, webAudioDriver } from "@playhub/ui";
import draw from "../assets/sounds/draw.m4a";
import land from "../assets/sounds/land.m4a";
import lose from "../assets/sounds/lose.m4a";
import select from "../assets/sounds/select.m4a";
import win from "../assets/sounds/win.m4a";
import yourTurn from "../assets/sounds/your-turn.m4a";
import { SOUND_NAMES } from "./sound";

export const sounds = createSoundPlayer(SOUND_NAMES, () =>
  webAudioDriver({ select, land, "your-turn": yourTurn, win, lose, draw }),
);

// Any tap in the app unlocks audio, so the first drop already has sound.
addEventListener("pointerdown", () => sounds.unlock(), { capture: true });
