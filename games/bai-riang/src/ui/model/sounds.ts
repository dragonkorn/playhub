import { createSoundPlayer, webAudioDriver } from "@playhub/ui";
import clear from "../assets/sounds/clear.m4a";
import lose from "../assets/sounds/lose.m4a";
import mistake from "../assets/sounds/mistake.m4a";
import reveal from "../assets/sounds/reveal.m4a";
import win from "../assets/sounds/win.m4a";
import { SOUND_NAMES } from "./sound";

export const sounds = createSoundPlayer(SOUND_NAMES, () => webAudioDriver({ reveal, mistake, clear, win, lose }));

// Any tap in the app unlocks audio, so the first reveal already has sound.
addEventListener("pointerdown", () => sounds.unlock(), { capture: true });
