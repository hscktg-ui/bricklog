/**
 * 인트로 타이핑 효과음 — Web Audio (파일 없음)
 * prefers-reduced-motion · 사용자 첫 상호작용 전에는 재생 안 함
 */

let audioCtx = null;
let unlocked = false;

function getCtx() {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  return audioCtx;
}

export function unlockIntroTypeSound() {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    void ctx.resume().then(() => {
      unlocked = true;
    });
  } else {
    unlocked = true;
  }
}

function playTickInternal(ctx) {
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = "square";
  osc.frequency.value = 720 + Math.random() * 180;
  filter.type = "lowpass";
  filter.frequency.value = 2400;
  gain.gain.setValueAtTime(0.028, t);
  gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.028);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(t);
  osc.stop(t + 0.032);
}

/** 짧은 타자기 클릭 (~30ms) — 메모 1~4줄용 */
export function playIntroTypeTick() {
  const ctx = getCtx();
  if (!ctx) return;

  if (ctx.state === "suspended") {
    void ctx.resume().then(() => {
      unlocked = true;
      if (ctx.state === "running") playTickInternal(ctx);
    });
    return;
  }

  unlocked = true;
  playTickInternal(ctx);
}

export function disposeIntroTypeSound() {
  if (audioCtx) {
    void audioCtx.close();
    audioCtx = null;
  }
  unlocked = false;
}
