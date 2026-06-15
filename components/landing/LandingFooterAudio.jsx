"use client";

import { useEffect, useState } from "react";
import {
  areBgmEnabled,
  setBgmEnabled,
  startBgm,
  stopBgm,
} from "@/lib/audio/briclogBgm";
import {
  areSoundsEnabled,
  setSoundsEnabled,
  unlockAudioFromUserGesture,
} from "@/lib/audio/briclogSounds";
import { VISION_CHIP_ACTIVE, VISION_CHIP_IDLE } from "@/lib/landing/vision2030Styles";

function VisionAudioChip({ label, active, onClick }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold tracking-tight transition ${
        active ? VISION_CHIP_ACTIVE : VISION_CHIP_IDLE
      }`}
    >
      {label}
    </button>
  );
}

/** 랜딩 푸터 — 기본 무음, 사용자가 켤 때만 (Vision 2030) */
export default function LandingFooterAudio() {
  const [sfxOn, setSfxOn] = useState(false);
  const [bgmOn, setBgmOn] = useState(false);

  useEffect(() => {
    setSfxOn(areSoundsEnabled());
    setBgmOn(areBgmEnabled());
    const syncSfx = () => setSfxOn(areSoundsEnabled());
    const syncBgm = () => setBgmOn(areBgmEnabled());
    window.addEventListener("briclog-sounds-changed", syncSfx);
    window.addEventListener("briclog-bgm-changed", syncBgm);
    return () => {
      window.removeEventListener("briclog-sounds-changed", syncSfx);
      window.removeEventListener("briclog-bgm-changed", syncBgm);
    };
  }, []);

  const toggleSfx = () => {
    const next = !sfxOn;
    setSoundsEnabled(next);
    setSfxOn(next);
    if (next) unlockAudioFromUserGesture();
  };

  const toggleBgm = () => {
    const next = !bgmOn;
    setBgmEnabled(next);
    setBgmOn(next);
    if (next) {
      unlockAudioFromUserGesture().then(() => startBgm());
    } else {
      stopBgm({ immediate: false });
    }
  };

  return (
    <div className="mt-6 flex flex-col gap-2 border-t border-[var(--vision-line)] pt-5 sm:mt-0 sm:border-0 sm:pt-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--vision-muted)]">
        소리 · 원할 때만
      </p>
      <div className="flex flex-wrap gap-2">
        <VisionAudioChip label="효과음" active={sfxOn} onClick={toggleSfx} />
        <VisionAudioChip label="분위기음" active={bgmOn} onClick={toggleBgm} />
      </div>
    </div>
  );
}
