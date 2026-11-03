export const SOUND_NAMES = ["select", "land", "your-turn", "win", "lose", "draw"] as const;
export type SoundName = (typeof SOUND_NAMES)[number];
