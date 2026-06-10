"use client";

import { BRICLOG_CHANNEL_ROADMAP } from "@/lib/product/craft";

/**
 * 향후 채널 확장 암시 — 비활성 채널도 로드맵으로 노출
 */
export default function ChannelRoadmapStrip({ ready = {}, className = "" }) {
  const readyMap = {
    blog: ready.blog,
    place: ready.place,
    insta: ready.insta,
    image: ready.image,
  };

  return (
    <div
      className={`rounded-xl border border-[#E8EBED] bg-[#FAFBFC] px-4 py-3 ${className}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8B95A1]">
        브랜드 콘텐츠 채널
      </p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {BRICLOG_CHANNEL_ROADMAP.map((ch) => {
          const isReady = ch.active && readyMap[ch.id];
          const isLive = ch.active;
          return (
            <li
              key={ch.id}
              title={ch.hint}
              className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
                isReady
                  ? "border-[#03C75A]/35 bg-[#E8F9EF] text-[#03A94D]"
                  : isLive
                    ? "border-[#E8EBED] bg-white text-[#4E5968]"
                    : "border-dashed border-[#E8EBED] bg-white text-[#B0B8C1]"
              }`}
            >
              {ch.label}
              {isReady ? " ✓" : ch.soon ? " · 준비 중" : ""}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
