// Generates Battleship sound effects with no dependencies, into ./sound.
// Writes WAV, then converts to AAC (.m4a) with macOS afconvert.
// Run: node build-sounds.mjs
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "sound");
const RATE = 44100;
const PEAK = 0.89; // about -1 dB, so AAC encoding has headroom

/** Seeded, so every build gives identical files. */
function randomFrom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
  };
}

const lerp = (a, b, t) => a + (b - a) * t;
const seconds = (duration) => Math.floor(duration * RATE);

/** Adds `fn(t, progress)` into `buffer`, starting at `start` seconds. */
function add(buffer, start, duration, fn) {
  const offset = seconds(start);
  const length = seconds(duration);
  for (let i = 0; i < length && offset + i < buffer.length; i++) {
    buffer[offset + i] += fn(i / RATE, i / length);
  }
}

/** Sine with a frequency that changes over time. */
function sweep(from, to, curve = 1) {
  let phase = 0;
  return (progress) => {
    phase += (2 * Math.PI * lerp(from, to, progress ** curve)) / RATE;
    return Math.sin(phase);
  };
}

/** White noise through a one-pole low-pass with a moving cutoff. */
function filteredNoise(seed, cutoff) {
  const noise = randomFrom(seed);
  let value = 0;
  return (progress) => {
    const alpha = 1 - Math.exp((-2 * Math.PI * cutoff(progress)) / RATE);
    value += alpha * (noise() - value);
    return value;
  };
}

function highPass(signal) {
  let previous = 0;
  return (progress) => {
    const value = signal(progress);
    const result = value - previous;
    previous = value;
    return result;
  };
}

function explosion(buffer, start, duration, seed, size = 1) {
  const body = filteredNoise(seed, (p) => lerp(3500, 120, p ** 0.35));
  const sub = sweep(95, 32, 0.6);
  const crackle = filteredNoise(seed + 1, () => 6000);
  add(buffer, start, duration, (_, p) => {
    const decay = Math.exp(-5 * p);
    const attack = Math.min(1, p * duration * 300);
    return attack * (body(p) * 3.2 * decay + sub(p) * 0.9 * size * Math.exp(-3.5 * p) + crackle(p) * 0.5 * Math.exp(-16 * p));
  });
}

function tone(buffer, start, duration, frequency, level = 0.5) {
  add(buffer, start, duration, (t, p) => {
    const body = Math.sin(2 * Math.PI * frequency * t) + 0.35 * Math.sin(4 * Math.PI * frequency * t) + 0.12 * Math.sin(6 * Math.PI * frequency * t);
    return body * level * Math.min(1, t * 300) * Math.exp(-4.5 * p);
  });
}

const SOUNDS = {
  aim(b) {
    add(b, 0, 0.05, (t, p) => Math.sin(2 * Math.PI * 1500 * t) * Math.exp(-7 * p));
  },
  launch(b) {
    const thump = sweep(150, 45, 0.5);
    const air = filteredNoise(11, (p) => lerp(2500, 300, p));
    add(b, 0, 0.42, (t, p) => Math.min(1, t * 400) * (thump(p) * Math.exp(-6 * p) + air(p) * 1.6 * Math.exp(-5 * p)));
  },
  whistle(b) {
    const pitch = sweep(1900, 480, 1.3);
    const air = highPass(filteredNoise(12, () => 7000));
    add(b, 0, 0.6, (t, p) => {
      const vibrato = 1 + 0.06 * Math.sin(2 * Math.PI * 22 * t);
      return (pitch(p) * 0.7 + air(p) * 0.5) * vibrato * Math.min(1, p * 5) * Math.min(1, (1 - p) * 12);
    });
  },
  splash(b) {
    const plop = sweep(260, 70, 0.5);
    const spray = filteredNoise(13, (p) => lerp(7500, 1100, p ** 0.6));
    add(b, 0, 0.75, (t, p) => plop(p) * 0.8 * Math.exp(-14 * p) + spray(p) * 2.6 * Math.min(1, t * 60) * Math.exp(-4.5 * p));
    const drop = randomFrom(14);
    for (let i = 0; i < 12; i++) {
      const start = 0.12 + ((drop() + 1) / 2) * 0.5;
      const frequency = 900 + ((drop() + 1) / 2) * 1700;
      add(b, start, 0.05, (t, p) => Math.sin(2 * Math.PI * lerp(frequency, frequency * 1.6, p) * t) * 0.14 * Math.exp(-5 * p));
    }
  },
  explosion(b) {
    explosion(b, 0, 1.2, 21);
  },
  "explosion-big"(b) {
    explosion(b, 0, 1.9, 31, 1.2);
    explosion(b, 0.32, 1.5, 41, 0.9);
    explosion(b, 0.8, 1.1, 51, 0.6);
  },
  "your-turn"(b) {
    tone(b, 0, 0.22, 784);
    tone(b, 0.13, 0.5, 1047);
  },
  eliminated(b) {
    tone(b, 0, 0.4, 523);
    tone(b, 0.26, 0.4, 415);
    tone(b, 0.52, 0.9, 311);
    explosion(b, 0.52, 1.0, 61, 1);
  },
};

const LENGTHS = { aim: 0.06, launch: 0.45, whistle: 0.62, splash: 0.85, explosion: 1.25, "explosion-big": 2.1, "your-turn": 0.7, eliminated: 1.6 };

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE(Math.round(s * 32767), i * 2));
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

mkdirSync(OUT, { recursive: true });
for (const [name, build] of Object.entries(SOUNDS)) {
  const samples = new Float32Array(seconds(LENGTHS[name]));
  build(samples);
  // Soft-clip, then normalize, so loud layers saturate instead of distorting harshly.
  for (let i = 0; i < samples.length; i++) samples[i] = Math.tanh(samples[i] * 1.2);
  const peak = samples.reduce((max, s) => Math.max(max, Math.abs(s)), 0);
  const rms = Math.sqrt(samples.reduce((sum, s) => sum + s * s, 0) / samples.length) / peak;
  for (let i = 0; i < samples.length; i++) samples[i] = (samples[i] / peak) * PEAK;
  const fade = Math.min(samples.length, seconds(0.01));
  for (let i = 0; i < fade; i++) samples[samples.length - 1 - i] *= i / fade;

  const wavPath = join(OUT, `${name}.wav`);
  const m4aPath = join(OUT, `${name}.m4a`);
  writeFileSync(wavPath, wav(Array.from(samples)));
  execFileSync("afconvert", ["-f", "m4af", "-d", "aac", "-b", "96000", wavPath, m4aPath]);
  rmSync(wavPath);
  console.log(`${name.padEnd(14)} ${LENGTHS[name].toFixed(2)}s  rms ${(20 * Math.log10(rms)).toFixed(1)} dB  ${(statSync(m4aPath).size / 1024).toFixed(1)} KB`);
}
