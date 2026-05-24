/**
 * BRICLOG UI sounds — Web Audio API, no external assets.
 * Quiet, premium SaaS feel; respects mute + prefers-reduced-motion.
 */

export const SOUNDS_STORAGE_KEY = "briclog-sounds-enabled";

const MAX_GAIN = 0.3;

let audioCtx = null;
let gestureUnlocked = false;
/** In-flight resume from the latest user gesture — play* awaits this. */
let pendingUnlock = null;

function prefersReducedMotion() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function areSoundsEnabled() {
  if (typeof window === "undefined") return false;
  if (prefersReducedMotion()) return false;
  try {
    const raw = localStorage.getItem(SOUNDS_STORAGE_KEY);
    if (raw === null) return true;
    return raw === "true" || raw === "1";
  } catch {
    return true;
  }
}

export function setSoundsEnabled(enabled) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SOUNDS_STORAGE_KEY, enabled ? "true" : "false");
  } catch {
    /* ignore */
  }
  window.dispatchEvent(
    new CustomEvent("briclog-sounds-changed", { detail: { enabled } })
  );
}

function createContext() {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  return audioCtx;
}

/** Shared AudioContext for UI sounds and ambient BGM. */
export function getSharedAudioContext() {
  return createContext();
}

export function getPendingUnlock() {
  return pendingUnlock;
}

function dispatchSfxPlay() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("briclog-sfx-play"));
}

/** Call from a user gesture (login, generate, toggle) to satisfy autoplay policy. */
export function unlockAudioFromUserGesture() {
  gestureUnlocked = true;
  const ctx = createContext();
  if (!ctx) {
    pendingUnlock = Promise.resolve(false);
    return pendingUnlock;
  }
  pendingUnlock = (async () => {
    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        return false;
      }
    }
    const ok = ctx.state === "running";
    if (ok) {
      import("@/lib/audio/briclogBgm")
        .then((m) => {
          m.ensureBgmPreferenceFromGesture();
          return m.maybeStartBgmAfterGestureUnlock();
        })
        .catch(() => {});
    }
    return ok;
  })();
  return pendingUnlock;
}

/** After OAuth / in-app navigation — play only if the browser already allows audio. */
export async function tryResumeAudioAfterNavigation() {
  if (!areSoundsEnabled()) return false;
  const ctx = createContext();
  if (!ctx || ctx.state !== "suspended") {
    if (ctx?.state === "running") gestureUnlocked = true;
    return ctx?.state === "running";
  }
  try {
    await ctx.resume();
  } catch {
    return false;
  }
  if (ctx.state === "running") gestureUnlocked = true;
  return ctx.state === "running";
}

async function readyContext() {
  if (!areSoundsEnabled()) return null;
  if (pendingUnlock) {
    try {
      await pendingUnlock;
    } catch {
      /* ignore */
    }
  }
  const ctx = createContext();
  if (!ctx) return null;
  if (ctx.state === "suspended") {
    if (!gestureUnlocked) return null;
    try {
      await ctx.resume();
    } catch {
      return null;
    }
  }
  return ctx.state === "running" ? ctx : null;
}

function scheduleTone(ctx, { freq, start, duration, gain = 0.08, type = "sine" }) {
  const t0 = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain * MAX_GAIN, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

/** Landing signature — very short brand chime (after user gesture on CTA) */
export async function playSignatureSound() {
  const ctx = await readyContext();
  if (!ctx) return;
  dispatchSfxPlay();
  scheduleTone(ctx, { freq: 440, start: 0, duration: 0.14, gain: 0.05, type: "sine" });
  scheduleTone(ctx, { freq: 554.37, start: 0.08, duration: 0.2, gain: 0.04, type: "triangle" });
}

/** Login / dashboard welcome — soft two-note lift */
export async function playConnectSound() {
  const ctx = await readyContext();
  if (!ctx) return;
  dispatchSfxPlay();
  scheduleTone(ctx, { freq: 523.25, start: 0, duration: 0.22, gain: 0.07 });
  scheduleTone(ctx, { freq: 659.25, start: 0.12, duration: 0.28, gain: 0.06 });
  scheduleTone(ctx, { freq: 783.99, start: 0.22, duration: 0.35, gain: 0.04, type: "triangle" });
}

/** Generation start — brief page rustle (filtered noise sweep) */
export async function playPageTurnSound() {
  const ctx = await readyContext();
  if (!ctx) return;
  dispatchSfxPlay();
  const duration = 0.32;
  const t0 = ctx.currentTime;
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i += 1) {
    const env = Math.sin((Math.PI * i) / bufferSize);
    data[i] = (Math.random() * 2 - 1) * env * 0.35;
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 0.9;
  filter.frequency.setValueAtTime(1400, t0);
  filter.frequency.exponentialRampToValueAtTime(420, t0 + duration);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(0.11 * MAX_GAIN, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  src.connect(filter);
  filter.connect(g);
  g.connect(ctx.destination);
  src.start(t0);
  src.stop(t0 + duration + 0.02);
}

/** Generation / feedback complete — gentle success chime */
export async function playSuccessSound() {
  const ctx = await readyContext();
  if (!ctx) return;
  dispatchSfxPlay();
  const notes = [
    { freq: 587.33, start: 0, duration: 0.35, gain: 0.07 },
    { freq: 739.99, start: 0.1, duration: 0.4, gain: 0.06 },
    { freq: 880, start: 0.2, duration: 0.55, gain: 0.05 },
  ];
  notes.forEach((n) => scheduleTone(ctx, { ...n, type: "triangle" }));
  scheduleTone(ctx, {
    freq: 1174.66,
    start: 0.32,
    duration: 0.45,
    gain: 0.03,
    type: "sine",
  });
}
