"use client";

import { useState } from "react";
import {
  loadChannelGenPref,
  saveChannelGenPref,
} from "@/lib/preferences/channelGenerationPrefs";
import { CHANNEL_GEN_PREFS } from "@/lib/product/craft";

/**
 * @param {'place'|'insta'|'image'} channel
 */
export default function ChannelGenPrefToggle({
  channel,
  preferStandalone,
  onPreferStandaloneChange,
  className = "",
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 text-[12px] transition-colors ${
        preferStandalone
          ? "border-[#E8EBED] bg-[#FAFBFC]"
          : "border-[#03C75A]/30 bg-[#F6FDF9]"
      } ${className}`}
    >
      <input
        type="checkbox"
        checked={preferStandalone}
        onChange={(e) => {
          const v = e.target.checked;
          onPreferStandaloneChange(v);
          saveChannelGenPref(channel, { preferStandalone: v });
        }}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#E8EBED] text-[#03C75A]"
      />
      <span className="min-w-0 flex-1">
        <span className="font-semibold text-[#191F28]">
          {CHANNEL_GEN_PREFS.standaloneLabel}
        </span>
        <span className="mt-1 block leading-relaxed text-[#4E5968]">
          {preferStandalone
            ? CHANNEL_GEN_PREFS.standaloneOnBody
            : CHANNEL_GEN_PREFS.standaloneOffBody}
        </span>
      </span>
    </label>
  );
}

/** @param {'place'|'insta'|'image'} channel */
export function useChannelPreferStandalone(channel) {
  const [preferStandalone, setPreferStandalone] = useState(
    () => loadChannelGenPref(channel).preferStandalone !== false
  );
  return [preferStandalone, setPreferStandalone];
}
