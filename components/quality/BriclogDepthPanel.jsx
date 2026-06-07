"use client";

import { useMemo } from "react";
import { DEPTH_BENCHMARK } from "@/lib/product/engineeringDepthLevels";

/**
 * 브릭로그 맥락·발행 준비도 — Lens SMC Score보다 깊은 다축 표면
 * @param {"compact"|"full"} variant
 */
export default function BriclogDepthPanel({
  contextScore,
  variant = "full",
  showDepthBadge = true,
}) {
  const data = useMemo(() => contextScore, [contextScore]);
  if (!data?.axes?.length) return null;

  const {
    publishScore,
    axes,
    readiness,
    channels,
    checks,
    improvementHint,
    depth,
  } = data;

  const readinessCls =
    readiness?.status === "ready"
      ? "text-[#03A94D]"
      : readiness?.status === "polishing"
        ? "text-[#E67700]"
        : "text-[#4E5968]";

  const compact = variant === "compact";
  const lensOverall = DEPTH_BENCHMARK.lens.overall;

  return (
    <div
      className={
        compact
          ? "rounded-xl border border-[#E8EBED] bg-[#FAFBFC] px-4 py-3"
          : "border-t border-[#E8EBED] bg-[#FAFBFC] px-5 py-4"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8B95A1]">
            브릭로그 발행 준비도
          </p>
          <p
            className={`font-bold leading-none text-[#191F28] ${
              compact ? "mt-1 text-[22px]" : "mt-1 text-[28px]"
            }`}
          >
            {publishScore}
            <span className="ml-0.5 text-[14px] font-semibold text-[#8B95A1]">
              점
            </span>
          </p>
          {readiness?.label ? (
            <p className={`mt-1 text-[12px] font-semibold ${readinessCls}`}>
              {readiness.label}
            </p>
          ) : null}
        </div>
        <div className="text-right text-[11px] text-[#8B95A1]">
          <p>맥락 일치 {checks?.relevancePct ?? "—"}%</p>
          <p>정보 단서 {checks?.infoUnits ?? 0}개</p>
          {showDepthBadge && depth?.levelLabel ? (
            <p className="mt-1 font-semibold text-[#03A94D]">
              표면 {depth.levelLabel}
              {depth.aheadOfLens ? (
                <span className="text-[#4E5968]">
                  {" "}
                  · Lens {lensOverall} 대비 +
                  {Math.max(0, depth.vsLens)}
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
      </div>

      <ul
        className={`grid gap-2 ${
          compact
            ? "mt-3 grid-cols-2 sm:grid-cols-4"
            : "mt-4 grid-cols-2 sm:grid-cols-4"
        }`}
      >
        {axes.map((axis) => (
          <li
            key={axis.id}
            className="rounded-xl border border-[#E8EBED] bg-white px-3 py-2.5"
          >
            <p className="text-[10px] font-semibold text-[#8B95A1]">
              {axis.label}
            </p>
            <p
              className={`font-bold text-[#191F28] ${
                compact ? "mt-0.5 text-[16px]" : "mt-0.5 text-[18px]"
              }`}
            >
              {axis.score}
            </p>
          </li>
        ))}
      </ul>

      {!compact ? (
        <div className="mt-4">
          <p className="text-[10px] font-semibold text-[#8B95A1]">
            한 주제로 쌓이는 채널
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {channels.map((ch) => (
              <li
                key={ch.id}
                className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
                  ch.ready
                    ? "border-[#03C75A]/30 bg-[#E8F9EF] text-[#03A94D]"
                    : "border-[#E8EBED] bg-white text-[#8B95A1]"
                }`}
                title={ch.hint}
              >
                {ch.label}
                {ch.ready ? " ✓" : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {improvementHint && !compact ? (
        <p className="mt-4 text-[12px] leading-relaxed text-[#4E5968]">
          {improvementHint}
        </p>
      ) : null}
    </div>
  );
}
