"use client";

import { useEffect, useState } from "react";
import SoundLabelToggle from "@/components/audio/SoundLabelToggle";
import {
  areBgmEnabled,
  setBgmEnabled,
  startBgm,
  stopBgm,
} from "@/lib/audio/briclogBgm";
import { unlockAudioFromUserGesture } from "@/lib/audio/briclogSounds";

/**
 * @param {{ className?: string, fullWidth?: boolean }} props
 */
export default function BgmToggle({ className = "", fullWidth = false }) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(areBgmEnabled());
    const sync = () => setOn(areBgmEnabled());
    window.addEventListener("briclog-bgm-changed", sync);
    return () => window.removeEventListener("briclog-bgm-changed", sync);
  }, []);

  const toggle = () => {
    const next = !on;
    setBgmEnabled(next);
    setOn(next);
    if (next) {
      unlockAudioFromUserGesture().then(() => startBgm());
    } else {
      stopBgm({ immediate: false });
    }
  };

  return (
    <SoundLabelToggle
      label="배경음악"
      active={on}
      onClick={toggle}
      className={className}
      fullWidth={fullWidth}
    />
  );
}
