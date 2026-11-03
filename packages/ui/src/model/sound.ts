export interface AudioDriver<Name extends string> {
  load(name: Name): Promise<unknown>;
  start(buffer: unknown): void;
  resume(): void;
}

export interface SoundPlayer<Name extends string> {
  /** Must run inside a tap, because browsers keep audio locked until then. */
  unlock(): void;
  play(name: Name): void;
  setMuted(muted: boolean): void;
}

export function createSoundPlayer<Name extends string>(names: readonly Name[], createDriver: () => AudioDriver<Name>): SoundPlayer<Name> {
  let driver: AudioDriver<Name> | null = null;
  let muted = false;
  const buffers = new Map<Name, unknown>();

  return {
    unlock() {
      if (driver) return driver.resume();
      const created = createDriver();
      driver = created;
      created.resume();
      for (const name of names) {
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

export function webAudioDriver<Name extends string>(urls: Record<Name, string>): AudioDriver<Name> {
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
