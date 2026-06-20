"use client";

import { VISION_WORKSPACE_PANEL } from "@/lib/landing/vision2030Styles";

const CAPABILITIES = {
  place: [
    { title: "한 줄 공지", body: "플레이스·지도에 바로 붙일 짧은 소식" },
    { title: "운영·혜택", body: "영업·예약·이벤트를 고객 눈높이로" },
    { title: "이야기 연동", body: "장문 이야기가 있으면 톤·사실을 맞춰 이어 씀" },
  ],
  insta: [
    { title: "캡션·줄바꿈", body: "피드·릴스에 맞는 짧은 문장" },
    { title: "해시태그", body: "지역·주제 태그 묶음" },
    { title: "톤 선택", body: "감성·정보·프로모션 톤 전환" },
  ],
};

export default function ChannelCapabilityCards({ channel, compact = false }) {
  const items = CAPABILITIES[channel];
  if (!items) return null;

  return (
    <div
      className={`grid gap-2 ${compact ? "grid-cols-1" : "sm:grid-cols-3"}`}
      aria-label="이 메뉴에서 할 수 있는 일"
    >
      {items.map((item) => (
        <div
          key={item.title}
          className={`px-3 py-3 ${VISION_WORKSPACE_PANEL}`}
        >
          <p className="text-[12px] font-semibold text-[var(--vision-ink)]">
            {item.title}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-[var(--vision-muted)]">
            {item.body}
          </p>
        </div>
      ))}
    </div>
  );
}
