// Generates ใบ้เรียง sound effects with no dependencies, into ./sound.
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

function tone(buffer, start, duration, frequency, level = 0.5) {
  add(buffer, start, duration, (t, p) => {
    const body = Math.sin(2 * Math.PI * frequency * t) + 0.35 * Math.sin(4 * Math.PI * frequency * t) + 0.12 * Math.sin(6 * Math.PI * frequency * t);
    return body * level * Math.min(1, t * 300) * Math.exp(-4.5 * p);
  });
}

/** A card flipped onto the table: a soft paper swish and a light tap. */
function flip(buffer, start, level, seed) {
  const swish = filteredNoise(seed, (p) => lerp(1800, 6000, p));
  add(buffer, start, 0.09, (t, p) => level * Math.min(1, t * 400) * swish(p) * 1.6 * Math.sin(Math.PI * p));
  const tap = sweep(420, 260, 0.6);
  add(buffer, start + 0.07, 0.06, (t, p) => level * 0.7 * Math.min(1, t * 2000) * tap(p) * Math.exp(-30 * p));
}

const SOUNDS = {
  reveal(b) {
    flip(b, 0, 1, 81);
  },
  mistake(b) {
    flip(b, 0, 0.6, 82);
    add(b, 0.08, 0.5, (t, p) => {
      const buzz = Math.sign(Math.sin(2 * Math.PI * 150 * t)) * 0.5 + Math.sin(2 * Math.PI * 155 * t) * 0.5;
      return buzz * 0.45 * Math.min(1, t * 200) * Math.exp(-3 * p);
    });
    tone(b, 0.12, 0.45, 233, 0.35);
  },
  clear(b) {
    [659, 784, 988].forEach((frequency, i) => tone(b, i * 0.1, 0.35, frequency, 0.45));
  },
  win(b) {
    [523, 659, 784].forEach((frequency, i) => tone(b, i * 0.12, 0.35, frequency));
    tone(b, 0.36, 0.9, 1047, 0.6);
    tone(b, 0.36, 0.9, 1319, 0.25);
  },
  lose(b) {
    [392, 330].forEach((frequency, i) => tone(b, i * 0.2, 0.4, frequency));
    tone(b, 0.4, 0.8, 262);
  },
};

const LENGTHS = { reveal: 0.18, mistake: 0.62, clear: 0.6, win: 1.3, lose: 1.25 };

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
