"use client";

/**
 * 심플 작업실 — 주제·키워드 안내 (유리님 피드백: 후기형·키워드 어려움)
 */
export default function KeywordTopicGuide({ compact = false }) {
  return (
    <div
      className="rounded-lg border border-[#E8EBED] bg-[#FAFBFC] px-3 py-2.5 text-[12px] leading-relaxed text-[#4E5968]"
      role="note"
    >
      <p className="font-semibold text-[#191F28]">주제만 적어도 됩니다</p>
      <ul className={`mt-1.5 space-y-1 ${compact ? "text-[11px]" : ""}`}>
        <li>
          <span className="font-medium text-[#03A94D]">주제</span> — 오늘 쓸
          이야기·장면 (검색어 아님)
        </li>
        <li>
          <span className="font-medium text-[#03A94D]">현장 한 줄</span> — 메뉴·
          분위기·체험 포인트 (조사에 반영)
        </li>
        <li>
          <span className="font-medium text-[#8B95A1]">키워드</span> — 비워 두면
          주제에서 자동. 「더 맞추기」에서 수정 가능
        </li>
      </ul>
    </div>
  );
}
