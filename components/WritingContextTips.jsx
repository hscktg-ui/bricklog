"use client";

/**
 * 작성 맥락 TIP 3~4개 — 접속(세션)마다 로테이션
 */
export default function WritingContextTips({ tips = [] }) {
  if (!tips?.length) return null;

  return (
    <ul className="space-y-2">
      {tips.map((tip) => (
        <li
          key={tip.id}
          className="rounded-lg border border-[#E8F0FF] bg-[#F7FAFF] px-3 py-2.5 text-[12px] leading-relaxed text-[#4E5968]"
        >
          <span className="mr-1.5 inline-block rounded bg-[#03C75A]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#03A94D]">
            TIP
          </span>
          {tip.text.replace(/^TIP ·\s*/, "")}
        </li>
      ))}
    </ul>
  );
}
