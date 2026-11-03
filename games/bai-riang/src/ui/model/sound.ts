export const SOUND_NAMES = ["reveal", "mistake", "clear", "win", "lose"] as const;
export type SoundName = (typeof SOUND_NAMES)[number];
