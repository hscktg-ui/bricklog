"use client";

import {
  buildManuscriptStatusLines,
  resolvePublishGrade,
} from "@/lib/product/publishUiDisplay";

/**
 * 원고 상태 카드 — 점수보다 상태·행동 가이드 우선
 */
export default function ManuscriptStatusCard({
  contextScore,
  compact = false,
  showScoreDetails = false,
}) {
  if (!contextScore?.axes?.length) return null;

  const grade = contextScore.publishGrade || resolvePublishGrade(contextScore);
  const lines = buildManuscriptStatusLines(contextScore.axes);
  const { readiness, publishScore, checks, sqvDiagnostic, humanVoiceMet, catalogProseOk } =
    contextScore;

  return (
    <div
      className={`rounded-xl border border-[#E8EBED] bg-white ${
        compact ? "px-4 py-3" : "px-5 py-4"
      }`}
      role="status"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8B95A1]">
            발행 등급
          </p>
          <p
            className={`mt-1 font-bold text-[#191F28] ${
              compact ? "text-[17px]" : "text-[19px]"
            }`}
          >
            <span aria-hidden>{grade.dot}</span> {grade.label}
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-[#4E5968]">
            {readiness?.hint || grade.action}
          </p>
        </div>
        <div
          className={`shrink-0 rounded-lg border px-3 py-2 text-center ${
            grade.tone === "ready"
              ? "border-[#03C75A]/30 bg-[#E8F9EF]"
              : grade.tone === "review"
                ? "border-[#FFE0B2] bg-[#FFF8E6]"
                : "border-[#FFD6D6] bg-[#FFF5F5]"
          }`}
        >
          <p className="text-[10px] font-semibold text-[#8B95A1]">등급</p>
          <p className="text-[22px] font-bold leading-none text-[#191F28]">
            {grade.id}
          </p>
        </div>
      </div>

      <ul
        className={`grid gap-2 ${
          compact ? "mt-3 grid-cols-2" : "mt-4 grid-cols-2 sm:grid-cols-4"
        }`}
      >
        {lines.map((row) => (
          <li
            key={row.id}
            className="rounded-lg border border-[#E8EBED] bg-[#FAFBFC] px-3 py-2"
          >
            <p className="text-[10px] font-semibold text-[#8B95A1]">
              {row.label}
            </p>
            <p className="mt-0.5 text-[13px] font-semibold text-[#191F28]">
              {row.quality}
            </p>
          </li>
        ))}
      </ul>

      {!catalogProseOk ? (
        <p className="mt-2 rounded-lg border border-[#FFE0B2] bg-[#FFF8E6] px-3 py-2 text-[11px] text-[#E67700]">
          카탈로그·체크리스트 문장이 섞여 있어 서사형으로 다듬는 중입니다.
        </p>
      ) : humanVoiceMet === false ? (
        <p className="mt-2 text-[11px] text-[#8B95A1]">
          사람 칼럼 말투 편집을 마치는 중입니다.
        </p>
      ) : null}

      {showScoreDetails && sqvDiagnostic ? (
        <p className="mt-2 text-[11px] text-[#8B95A1]">
          내부 글값(SQV): {sqvDiagnostic.label} — 발행 등급과 별도로 참고용입니다.
        </p>
      ) : null}

      {showScoreDetails ? (
        <details className="mt-3 rounded-lg border border-[#E8EBED] bg-[#FAFBFC] px-3 py-2">
          <summary className="cursor-pointer text-[11px] font-semibold text-[#8B95A1] marker:content-none [&::-webkit-details-marker]:hidden">
            세부 점수 보기
          </summary>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-[#4E5968] sm:grid-cols-4">
            {contextScore.axes.map((axis) => (
              <p key={axis.id}>
                {axis.label} {axis.score}
              </p>
            ))}
            <p className="col-span-2 sm:col-span-4">
              종합 {publishScore} · 맥락 {checks?.relevancePct ?? "—"}%
            </p>
          </div>
        </details>
      ) : null}
    </div>
  );
}
