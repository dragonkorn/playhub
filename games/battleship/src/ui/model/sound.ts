export const SOUND_NAMES = ["aim", "launch", "whistle", "splash", "explosion", "explosion-big", "your-turn", "eliminated"] as const;
export type SoundName = (typeof SOUND_NAMES)[number];
