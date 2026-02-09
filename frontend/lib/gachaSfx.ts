import { loadString, saveString } from "@/lib/storage";

const KEY = "osikatu:gacha:sfx";

let cachedEnabled: boolean | null = null;
let audioCtx: AudioContext | null = null;

export function getGachaSfxEnabled(): boolean {
  if (cachedEnabled !== null) return cachedEnabled;
  const raw = loadString(KEY);
  cachedEnabled = raw ? raw === "true" : true; // default ON
  return cachedEnabled;
}

export function setGachaSfxEnabled(enabled: boolean) {
  cachedEnabled = enabled;
  saveString(KEY, String(enabled));
}

function markPlayed() {
  if (typeof window === "undefined") return;
  try {
    // Test hook (no-op unless tests read it).
    (window as any).__SFX_PLAYED = true;
  } catch {
    // ignore
  }
}

function ensureContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx =
    (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) {
    audioCtx = new Ctx();
  }
  return audioCtx;
}

function canPlay(): boolean {
  if (typeof window === "undefined") return false;
  if (!getGachaSfxEnabled()) return false;
  return true;
}

export function playGachaBell(): void {
  if (!canPlay()) return;
  const ctx = ensureContext();
  if (!ctx) return;

  markPlayed();

  const now = ctx.currentTime;

  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, now);
  out.gain.exponentialRampToValueAtTime(0.28, now + 0.02);
  out.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
  out.connect(ctx.destination);

  const o1 = ctx.createOscillator();
  const o2 = ctx.createOscillator();
  o1.type = "sine";
  o2.type = "sine";
  o1.frequency.setValueAtTime(880, now);
  o2.frequency.setValueAtTime(1320, now);

  const detune = ctx.createGain();
  detune.gain.setValueAtTime(1, now);
  detune.gain.linearRampToValueAtTime(0.7, now + 0.1);
  detune.gain.linearRampToValueAtTime(0.0, now + 0.45);

  o1.connect(detune);
  o2.connect(detune);
  detune.connect(out);

  o1.start(now);
  o2.start(now);
  o1.stop(now + 0.5);
  o2.stop(now + 0.5);
}

export function playGachaPaperRip(): void {
  if (!canPlay()) return;
  const ctx = ensureContext();
  if (!ctx) return;

  markPlayed();

  const now = ctx.currentTime;
  const duration = 0.18;
  const sampleRate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(sampleRate * duration));

  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    // White noise with quick decay.
    const t = i / length;
    const env = Math.pow(1 - t, 2);
    data[i] = (Math.random() * 2 - 1) * env;
  }

  const src = ctx.createBufferSource();
  src.buffer = buffer;

  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.setValueAtTime(1600, now);
  band.Q.setValueAtTime(0.7, now);

  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, now);
  out.gain.exponentialRampToValueAtTime(0.22, now + 0.01);
  out.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  out.connect(ctx.destination);

  src.connect(band);
  band.connect(out);

  src.start(now);
  src.stop(now + duration);
}

