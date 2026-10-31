export const SOUND_NAMES = ["aim", "launch", "whistle", "splash", "explosion", "explosion-big", "your-turn", "eliminated"] as const;
export type SoundName = (typeof SOUND_NAMES)[number];

export interface AudioDriver {
  load(name: SoundName): Promise<unknown>;
  start(buffer: unknown): void;
  resume(): void;
}

export interface SoundPlayer {
  /** Must run inside a tap, because browsers keep audio locked until then. */
  unlock(): void;
  play(name: SoundName): void;
  setMuted(muted: boolean): void;
}

export function createSoundPlayer(createDriver: () => AudioDriver): SoundPlayer {
  let driver: AudioDriver | null = null;
  let muted = false;
  const buffers = new Map<SoundName, unknown>();

  return {
    unlock() {
      if (driver) return driver.resume();
      const created = createDriver();
      driver = created;
      created.resume();
      for (const name of SOUND_NAMES) {
        created.load(name).then(
          (buffer) => buffers.set(name, buffer),
          () => {},
        );
      }
    },
    play(name) {
      if (muted || !driver || !buffers.has(name)) return;
      driver.start(buffers.get(name));
    },
    setMuted(value) {
      muted = value;
    },
  };
}

export function webAudioDriver(urls: Record<SoundName, string>): AudioDriver {
  const context = new AudioContext();
  return {
    async load(name) {
      const response = await fetch(urls[name]);
      return context.decodeAudioData(await response.arrayBuffer());
    },
    start(buffer) {
      const source = context.createBufferSource();
      source.buffer = buffer as AudioBuffer;
      source.connect(context.destination);
      source.start();
    },
    resume() {
      void context.resume();
    },
  };
}
