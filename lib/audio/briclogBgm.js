/**
 * BRICLOG ambient BGM — 5 original procedural pieces, sequential loop.
 */

import {
  BRICLOG_PIECES,
  BRICLOG_PIECES_VERSION,
  buildPieceBuffer,
} from "@/lib/audio/briclogPieces";
import { getSharedAudioContext, getPendingUnlock } from "@/lib/audio/briclogSounds";

export const BGM_STORAGE_KEY = "briclog-bgm-enabled";

const TARGET_GAIN = 0.088;
const FADE_IN_SEC = 2.2;
const FADE_OUT_SEC = 1.8;
const CROSS_PIECE_SEC = 1.4;
const DUCK_GAIN = 0.03;
const DUCK_MS = 520;

let pieceBuffers = null;
let pieceBuffersCtx = null;
let pieceBuffersVersion = 0;
let sourceNode = null;
let masterGain = null;
let filterNode = null;
let playing = false;
let pausedByVisibility = false;
let listenersBound = false;
let pieceIndex = 0;
let pieceEndTimer = null;

function prefersReducedMotion() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function areBgmEnabled() {
  if (typeof window === "undefined") return false;
  if (prefersReducedMotion()) return false;
  try {
    const raw = localStorage.getItem(BGM_STORAGE_KEY);
    if (raw === null) return true;
    return raw === "true" || raw === "1";
  } catch {
    return true;
  }
}

export function setBgmEnabled(enabled) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BGM_STORAGE_KEY, enabled ? "true" : "false");
  } catch {
    /* ignore */
  }
  window.dispatchEvent(
    new CustomEvent("briclog-bgm-changed", { detail: { enabled } })
  );
  if (!enabled) stopBgm();
}

/** First user gesture — opt in to BGM if user never chose. */
export function ensureBgmPreferenceFromGesture() {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(BGM_STORAGE_KEY) === null) {
      localStorage.setItem(BGM_STORAGE_KEY, "true");
      window.dispatchEvent(
        new CustomEvent("briclog-bgm-changed", { detail: { enabled: true } })
      );
    }
  } catch {
    /* ignore */
  }
}

function ensurePieceBuffers(ctx) {
  if (
    pieceBuffers &&
    pieceBuffersCtx === ctx &&
    pieceBuffersVersion === BRICLOG_PIECES_VERSION
  ) {
    return pieceBuffers;
  }
  pieceBuffers = BRICLOG_PIECES.map((p) => buildPieceBuffer(ctx, p));
  pieceBuffersCtx = ctx;
  pieceBuffersVersion = BRICLOG_PIECES_VERSION;
  return pieceBuffers;
}

function ensureMasterChain(ctx, filterHz = 5000) {
  if (!masterGain || masterGain.context !== ctx) {
    masterGain = ctx.createGain();
    filterNode = ctx.createBiquadFilter();
    masterGain.connect(filterNode);
    filterNode.connect(ctx.destination);
  }
    filterNode.type = "lowpass";
    filterNode.frequency.value = filterHz;
    filterNode.Q.value = 0.25;
  masterGain.gain.value = 0;
  return masterGain;
}

function clearPieceTimer() {
  if (pieceEndTimer) {
    window.clearTimeout(pieceEndTimer);
    pieceEndTimer = null;
  }
}

function stopSourceNode(immediate) {
  const ctx = getSharedAudioContext();
  if (!sourceNode || !ctx || !masterGain) {
    sourceNode = null;
    return;
  }
  const now = ctx.currentTime;
  const fade = immediate ? 0.05 : CROSS_PIECE_SEC;
  try {
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(masterGain.gain.value, now);
    masterGain.gain.linearRampToValueAtTime(0, now + fade);
    const src = sourceNode;
    sourceNode = null;
    window.setTimeout(() => {
      try {
        src.stop();
      } catch {
        /* ignore */
      }
      try {
        src.disconnect();
      } catch {
        /* ignore */
      }
    }, fade * 1000 + 60);
  } catch {
    sourceNode = null;
  }
}

function scheduleNextPiece(ctx, buffers) {
  clearPieceTimer();
  if (!playing || !areBgmEnabled()) return;

  pieceIndex = (pieceIndex + 1) % buffers.length;
  const piece = BRICLOG_PIECES[pieceIndex];
  const buffer = buffers[pieceIndex];
  const gain = ensureMasterChain(ctx, piece.filterHz);
  const now = ctx.currentTime;

  stopSourceNode(false);

  sourceNode = ctx.createBufferSource();
  sourceNode.buffer = buffer;
  sourceNode.loop = false;
  sourceNode.connect(gain);

  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(TARGET_GAIN, now + CROSS_PIECE_SEC);

  sourceNode.start(now);
  pieceEndTimer = window.setTimeout(() => {
    if (playing) scheduleNextPiece(ctx, buffers);
  }, piece.durationSec * 1000 - CROSS_PIECE_SEC * 500);
}

function playPieceAt(ctx, buffers, index) {
  pieceIndex = index % buffers.length;
  const piece = BRICLOG_PIECES[pieceIndex];
  const buffer = buffers[pieceIndex];
  const gain = ensureMasterChain(ctx, piece.filterHz);
  const now = ctx.currentTime;

  sourceNode = ctx.createBufferSource();
  sourceNode.buffer = buffer;
  sourceNode.loop = false;
  sourceNode.connect(gain);

  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(TARGET_GAIN, now + FADE_IN_SEC);

  sourceNode.start(now);
  pieceEndTimer = window.setTimeout(() => {
    if (playing) scheduleNextPiece(ctx, buffers);
  }, piece.durationSec * 1000 - CROSS_PIECE_SEC * 500);
}

function bindListenersOnce() {
  if (listenersBound || typeof window === "undefined") return;
  listenersBound = true;

  window.addEventListener("briclog-sfx-play", () => duckBgmBriefly());

  document.addEventListener("visibilitychange", () => {
    if (!areBgmEnabled()) return;
    if (document.hidden) {
      if (playing) {
        pausedByVisibility = true;
        stopBgm({ immediate: false });
      }
    } else if (pausedByVisibility) {
      pausedByVisibility = false;
      startBgm();
    }
  });

  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", () => {
    if (prefersReducedMotion()) stopBgm();
  });
}

async function readyForBgm() {
  if (!areBgmEnabled()) return null;
  const pending = getPendingUnlock();
  if (pending) {
    try {
      await pending;
    } catch {
      /* ignore */
    }
  }
  const ctx = getSharedAudioContext();
  if (!ctx) return null;
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      return null;
    }
  }
  return ctx.state === "running" ? ctx : null;
}

export async function startBgm({ fromPiece = 0 } = {}) {
  if (typeof window === "undefined") return;
  if (!areBgmEnabled()) return;
  bindListenersOnce();

  const ctx = await readyForBgm();
  if (!ctx) return;

  if (playing) {
    stopBgm({ immediate: true });
    await new Promise((r) => window.setTimeout(r, 120));
  }

  const buffers = ensurePieceBuffers(ctx);
  playing = true;
  pausedByVisibility = false;
  playPieceAt(ctx, buffers, fromPiece);
}

export function stopBgm({ immediate = false } = {}) {
  playing = false;
  clearPieceTimer();
  stopSourceNode(immediate);
  if (immediate) {
    const ctx = getSharedAudioContext();
    if (ctx && masterGain) {
      masterGain.gain.cancelScheduledValues(ctx.currentTime);
      masterGain.gain.value = 0;
    }
  }
}

export async function maybeStartBgmAfterGestureUnlock() {
  ensureBgmPreferenceFromGesture();
  if (!areBgmEnabled()) return;
  await startBgm();
}

export function duckBgmBriefly() {
  if (!playing || !masterGain) return;
  const ctx = masterGain.context;
  const now = ctx.currentTime;
  const duckUntil = now + DUCK_MS / 1000;
  masterGain.gain.cancelScheduledValues(now);
  masterGain.gain.setValueAtTime(masterGain.gain.value, now);
  masterGain.gain.linearRampToValueAtTime(DUCK_GAIN, now + 0.06);
  masterGain.gain.linearRampToValueAtTime(TARGET_GAIN, duckUntil);
}

export function getBgmPieceCount() {
  return BRICLOG_PIECES.length;
}
