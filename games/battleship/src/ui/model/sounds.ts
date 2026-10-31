import aim from "../assets/sounds/aim.m4a";
import eliminated from "../assets/sounds/eliminated.m4a";
import explosionBig from "../assets/sounds/explosion-big.m4a";
import explosion from "../assets/sounds/explosion.m4a";
import launch from "../assets/sounds/launch.m4a";
import splash from "../assets/sounds/splash.m4a";
import whistle from "../assets/sounds/whistle.m4a";
import yourTurn from "../assets/sounds/your-turn.m4a";
import { createSoundPlayer, webAudioDriver } from "./sound";

export const sounds = createSoundPlayer(() =>
  webAudioDriver({
    aim,
    launch,
    whistle,
    splash,
    explosion,
    "explosion-big": explosionBig,
    "your-turn": yourTurn,
    eliminated,
  }),
);

// Any tap in the app unlocks audio, so the first shot already has sound.
addEventListener("pointerdown", () => sounds.unlock(), { capture: true });
