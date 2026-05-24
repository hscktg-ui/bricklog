"use client";

import { WORKSPACE_BLOG } from "@/lib/product/craft";

/**
 * 이야기 생성 시 채널팩(플레이스·인스타 연쇄) on/off — 상태별 설명
 */
export default function ChannelPackToggle({
  blogOnly,
  onChange,
  disabled = false,
  compactCopy = false,
}) {
  const packEnabled = !blogOnly;

  return (
    <div
      className={`mt-4 rounded-xl border px-3 py-3 text-[12px] transition-colors ${
        packEnabled
          ? "border-[#03C75A]/35 bg-[#F6FDF9]"
          : "border-[#E8EBED] bg-[#FAFBFC]"
      } ${disabled ? "pointer-events-none opacity-55" : ""}`}
    >
      <label className="flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          checked={packEnabled}
          disabled={disabled}
          onChange={(e) => onChange(!e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#E8EBED] text-[#03C75A]"
          aria-describedby="channel-pack-hint"
        />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-[#191F28]">
              {WORKSPACE_BLOG.packChannelsLabel}
            </span>
            {!packEnabled ? (
              <span className="rounded-md bg-[#03C75A]/12 px-1.5 py-0.5 text-[10px] font-semibold text-[#03A94D]">
                추천
              </span>
            ) : null}
          </span>
          {compactCopy ? (
            <p id="channel-pack-hint" className="mt-1 text-[11px] text-[#8B95A1]">
              {packEnabled
                ? "플레이스·인스타 함께 (이야기 먼저 표시)"
                : "이야기만 먼저"}
            </p>
          ) : (
            <>
              <p
                id="channel-pack-hint"
                className="mt-1.5 leading-relaxed text-[#4E5968]"
              >
                {packEnabled
                  ? WORKSPACE_BLOG.packChannelsOnBody
                  : WORKSPACE_BLOG.packChannelsOffBody}
              </p>
              <p className="mt-1 text-[11px] text-[#8B95A1]">
                {WORKSPACE_BLOG.packChannelsNote}
              </p>
            </>
          )}
        </span>
      </label>
    </div>
  );
}
