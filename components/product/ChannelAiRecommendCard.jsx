"use client";

/**
 * 생성 전 AI 기획 추천 — 사용자는 수정만 하면 됨
 */
export default function ChannelAiRecommendCard({ channel, card, compact = false }) {
  if (!card) return null;

  return (
    <div
      className={`rounded-xl border border-[#03C75A]/25 bg-gradient-to-br from-[#F6FDF9] to-white ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <p className="text-[11px] font-bold uppercase tracking-wide text-[#03A94D]">
        AI 기획 추천
      </p>
      <p className="mt-1 text-[12px] text-[#4E5968]">
        {channel === "place"
          ? "주제만 넣으면 공지 유형·CTA까지 맞춰 둡니다."
          : channel === "blog"
            ? "주제만 넣으면 조사 방향·독자·원고 톤을 먼저 잡아 둡니다."
            : "주제만 넣으면 목적·분위기·해시태그까지 맞춰 둡니다."}
      </p>
      <ul className={`mt-3 space-y-2 ${compact ? "text-[11px]" : "text-[12px]"}`}>
        <li className="flex gap-2">
          <span className="shrink-0 font-semibold text-[#8B95A1]">소재</span>
          <span className="text-[#191F28]">{card.topicHint}</span>
        </li>
        <li className="flex gap-2">
          <span className="shrink-0 font-semibold text-[#8B95A1]">독자</span>
          <span className="text-[#191F28]">{card.audienceLabel}</span>
        </li>
        <li className="flex gap-2">
          <span className="shrink-0 font-semibold text-[#8B95A1]">CTA</span>
          <span className="text-[#191F28]">{card.ctaLabel}</span>
        </li>
        {card.hashtagPreview?.length ? (
          <li className="flex gap-2">
            <span className="shrink-0 font-semibold text-[#8B95A1]">태그</span>
            <span className="text-[#03A94D]">{card.hashtagPreview.join(" ")}</span>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
