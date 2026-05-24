"use client";

import { useState } from "react";
import {
  CQREVIEW_DIMENSION_LABELS,
  CQREVIEW_THRESHOLD,
} from "@/lib/quality/contentQualityReviewConstants";

const SCORE_KEYS = [
  "brandConsistency",
  "readerPerspective",
  "informationValue",
  "readability",
  "reliability",
  "seoFit",
  "aiTrace",
];

export default function ContentQualityReviewPanel({
  review,
  className = "",
  defaultOpen = false,
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (!review || typeof review.finalScore !== "number") return null;

  const approved = review.approved ?? review.finalScore >= CQREVIEW_THRESHOLD;
  const scores = review.scores || {};

  return (
    <section
      className={`rounded-xl border ${approved ? "border-[#03C75A]/35 bg-[#F6FDF9]" : "border-[#E8EBED] bg-[#FAFBFC]"} ${className}`}
      aria-label="콘텐츠 품질 검수"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#03A94D]">
            콘텐츠 품질 검수
          </p>
          <p className="mt-0.5 text-[18px] font-bold text-[#191F28]">
            콘텐츠 품질 점수{" "}
            <span className={approved ? "text-[#03A94D]" : "text-[#E67700]"}>
              {review.finalScore}점
            </span>
            <span className="ml-2 text-[12px] font-normal text-[#8B95A1]">
              / {CQREVIEW_THRESHOLD}점 {approved ? "출고 승인" : "자동 수정 반영"}
            </span>
          </p>
        </div>
        <span className="text-[12px] text-[#8B95A1]">{open ? "접기" : "펼치기"}</span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-[#E8EBED]/80 px-4 pb-4 pt-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SCORE_KEYS.map((key) => (
              <div
                key={key}
                className="rounded-lg border border-[#E8EBED] bg-white px-2.5 py-2"
              >
                <p className="text-[10px] text-[#8B95A1]">
                  {CQREVIEW_DIMENSION_LABELS[key] || key}
                </p>
                <p className="text-[15px] font-bold text-[#191F28]">
                  {scores[key] ?? "—"}
                </p>
              </div>
            ))}
            <div className="rounded-lg border border-[#E8EBED] bg-white px-2.5 py-2">
              <p className="text-[10px] text-[#8B95A1]">플랫폼 적합성</p>
              <p className="text-[15px] font-bold text-[#191F28]">
                {scores.platformFit ?? "—"}
              </p>
            </div>
          </div>

          {(scores.naverBlogFit != null ||
            scores.instagramFit != null ||
            scores.smartplaceFit != null) && (
            <p className="text-[11px] text-[#8B95A1]">
              채널 · 네이버 {scores.naverBlogFit ?? "—"} · 인스타{" "}
              {scores.instagramFit ?? "—"} · 플레이스 {scores.smartplaceFit ?? "—"}
            </p>
          )}

          {review.summary ? (
            <p className="text-[13px] leading-relaxed text-[#4E5968]">
              {review.summary}
            </p>
          ) : null}

          {review.perspectives?.length > 0 && (
            <ul className="space-y-1 text-[12px] text-[#4E5968]">
              {review.perspectives.map((p) => (
                <li key={p.role}>
                  <span className="font-semibold text-[#191F28]">{p.role}</span>
                  {": "}
                  {p.note}
                </li>
              ))}
            </ul>
          )}

          {review.improvementSuggestions?.length > 0 && (
            <div>
              <p className="text-[12px] font-semibold text-[#191F28]">개선 제안</p>
              <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-[12px] text-[#4E5968]">
                {review.improvementSuggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>
          )}

          {review.revisionCount > 0 && (
            <p className="text-[11px] text-[#8B95A1]">
              품질 검수 자동 수정 {review.revisionCount}회 적용
            </p>
          )}
        </div>
      )}
    </section>
  );
}
