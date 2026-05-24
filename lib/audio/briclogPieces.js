/**
 * BRICLOG signature BGM — procedural, no samples.
 * Warm lo-fi / study-jazz feel: major7 colors, soft pulse, no melancholy minor drones.
 */

export const BRICLOG_PIECES_VERSION = 3;

/** @typedef {{ id: string, label: string, durationSec: number, bpm: number, chords: number[][], bassRoots: number[], filterHz: number, brush?: boolean }} BriclogPiece */

/** Five linked cues — “브릭로그 스튜디오” 시그니처 루프 */
export const BRICLOG_PIECES = [
  {
    id: "briclog-morning-ledger",
    label: "Morning Ledger",
    durationSec: 28,
    bpm: 70,
    chords: [
      [261.63, 329.63, 392.0, 493.88],
      [349.23, 440.0, 523.25, 659.25],
      [220.0, 261.63, 329.63, 392.0],
      [293.66, 349.23, 440.0, 523.25],
    ],
    bassRoots: [130.81, 174.61, 110.0, 146.83],
    filterHz: 4300,
    brush: true,
  },
  {
    id: "briclog-mint-focus",
    label: "Mint Focus",
    durationSec: 30,
    bpm: 68,
    chords: [
      [392.0, 493.88, 587.33, 739.99],
      [440.0, 554.37, 659.25, 830.61],
      [349.23, 440.0, 523.25, 659.25],
      [293.66, 369.99, 440.0, 554.37],
    ],
    bassRoots: [196.0, 220.0, 174.61, 146.83],
    filterHz: 4100,
    brush: true,
  },
  {
    id: "briclog-soft-typewriter",
    label: "Soft Typewriter",
    durationSec: 26,
    bpm: 72,
    chords: [
      [329.63, 415.3, 493.88, 622.25],
      [369.99, 466.16, 554.37, 698.46],
      [293.66, 369.99, 440.0, 554.37],
      [261.63, 329.63, 392.0, 493.88],
    ],
    bassRoots: [164.81, 185.0, 146.83, 130.81],
    filterHz: 4400,
    brush: false,
  },
  {
    id: "briclog-brand-lounge",
    label: "Brand Lounge",
    durationSec: 32,
    bpm: 66,
    chords: [
      [440.0, 554.37, 659.25, 830.61],
      [415.3, 523.25, 622.25, 783.99],
      [349.23, 440.0, 523.25, 659.25],
      [392.0, 493.88, 587.33, 739.99],
    ],
    bassRoots: [220.0, 207.65, 174.61, 196.0],
    filterHz: 4000,
    brush: true,
  },
  {
    id: "briclog-evening-proof",
    label: "Evening Proof",
    durationSec: 27,
    bpm: 74,
    chords: [
      [523.25, 659.25, 783.99, 987.77],
      [493.88, 622.25, 739.99, 932.33],
      [440.0, 554.37, 659.25, 830.61],
      [466.16, 587.33, 698.46, 880.0],
    ],
    bassRoots: [261.63, 246.94, 220.0, 233.08],
    filterHz: 4500,
    brush: false,
  },
];

function chordAtTime(piece, t) {
  const seg = piece.durationSec / piece.chords.length;
  const idx = Math.floor(t / seg) % piece.chords.length;
  return piece.chords[idx];
}

function bassRootAtTime(piece, t) {
  const beat = (piece.bpm / 60) * t;
  const idx = Math.floor(beat * 0.5) % piece.bassRoots.length;
  return piece.bassRoots[idx];
}

/**
 * @param {number} t seconds
 * @param {BriclogPiece} piece
 * @param {{ value: number }} noiseState
 */
export function renderPieceSample(t, piece, noiseState) {
  const freqs = chordAtTime(piece, t);
  const beat = (piece.bpm / 60) * t;
  const pulse = 0.94 + 0.06 * Math.sin(2 * Math.PI * beat);
  const swell = 0.9 + 0.1 * Math.sin((2 * Math.PI * t) / (piece.durationSec * 1.15));

  let s = 0;
  freqs.forEach((f, j) => {
    const weight = j === 0 ? 0.075 : j === 1 ? 0.045 : 0.028;
    const phase = 2 * Math.PI * f * t;
    s += Math.sin(phase) * weight;
    if (j <= 1) {
      s += Math.sin(phase * 2) * weight * 0.12;
    }
  });

  const bass = bassRootAtTime(piece, t);
  const bassEnvelope = 0.65 + 0.35 * Math.sin(Math.PI * ((beat * 0.5) % 1));
  s += Math.sin(2 * Math.PI * bass * t) * 0.032 * bassEnvelope;

  noiseState.value = noiseState.value * 0.98 + (Math.random() * 2 - 1) * 0.025;
  let noise = noiseState.value * 0.006;
  if (piece.brush) {
    const step = Math.floor(beat * 2) % 4;
    if (step === 1 || step === 3) {
      noise += (Math.random() * 2 - 1) * 0.004;
    }
  }

  return (s + noise) * pulse * swell * 0.55;
}

/**
 * @param {AudioContext} ctx
 * @param {BriclogPiece} piece
 */
export function buildPieceBuffer(ctx, piece) {
  const sampleRate = ctx.sampleRate;
  const crossfade = Math.floor(0.9 * sampleRate);
  const coreLen = Math.floor(piece.durationSec * sampleRate);
  const scratchLen = coreLen + crossfade;
  const scratch = new Float32Array(scratchLen);
  const noiseState = { value: 0 };

  for (let i = 0; i < scratchLen; i += 1) {
    scratch[i] = renderPieceSample(i / sampleRate, piece, noiseState);
  }

  const out = ctx.createBuffer(2, coreLen, sampleRate);
  for (let ch = 0; ch < 2; ch += 1) {
    const channel = out.getChannelData(ch);
    for (let i = 0; i < coreLen; i += 1) channel[i] = scratch[i];
    for (let i = 0; i < crossfade; i += 1) {
      const a = i / crossfade;
      channel[i] = scratch[i] * (1 - a) + scratch[coreLen + i] * a;
    }
  }
  return out;
}
