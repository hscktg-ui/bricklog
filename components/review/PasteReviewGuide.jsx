"use client";

const CHECKS = [
  { title: "과장·단정", body: "효과·최고·유일 등 발행 리스크 표현" },
  { title: "톤·채널", body: "블로그·플레이스·인스타에 맞는 길이·말투" },
  { title: "사실·고지", body: "가격·일정·의료·법적 고지 누락 여부" },
];

export default function PasteReviewGuide() {
  return (
    <div
      className="rounded-xl border border-dashed border-[#C5CAD0] bg-[#FAFBFC] p-4"
      aria-label="검수 안내"
    >
      <p className="text-[13px] font-semibold text-[#191F28]">
        붙여 넣으면 이렇게 점검합니다
      </p>
      <ul className="mt-3 space-y-2">
        {CHECKS.map((c) => (
          <li key={c.title} className="flex gap-2 text-[12px] leading-relaxed">
            <span className="mt-0.5 text-[#03C75A]" aria-hidden>
              ✓
            </span>
            <span>
              <strong className="text-[#4E5968]">{c.title}</strong>
              <span className="text-[#8B95A1]"> — {c.body}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-[#B0B8C1]">
        검수는 무료입니다. AI 개선·보완은 「이야기」와 같은 월간 횟수를 사용합니다.
      </p>
    </div>
  );
}
