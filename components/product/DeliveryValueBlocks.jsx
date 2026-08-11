"use client";

import { VISION_EYEBROW, VISION_PANEL } from "@/lib/landing/vision2030Styles";

/**
 * 글값 블록 — 운영 계획 · 조사 · 설명 + OS 센터 · 시간 KPI · DNA
 */
export default function DeliveryValueBlocks({ exposure = null, compact = false }) {
  if (!exposure?.operatingItems?.length && !exposure?.researchLines?.length) {
    return null;
  }

  const panel = compact
    ? "rounded-xl border border-[var(--vision-line,#E8EBED)] bg-[var(--vision-paper,#F7F8FA)] px-3 py-3"
    : `${VISION_PANEL} px-4 py-4`;

  return (
    <section className={`${panel} space-y-3`} aria-label="이번 글의 가치">
      <div>
        <p
          className={
            compact
              ? "text-[10px] font-semibold uppercase tracking-wide text-[var(--vision-muted)]"
              : VISION_EYEBROW
          }
        >
          Brand Content OS · 기획·조사·설명
        </p>
        {exposure.operatingHeadline ? (
          <h3
            className={`${compact ? "mt-0.5 text-[14px]" : "mt-1 text-[15px]"} font-bold text-[var(--vision-ink)]`}
          >
            {exposure.operatingHeadline}
          </h3>
        ) : null}
      </div>

      {exposure.centers?.length ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="운영 센터">
          {exposure.centers.map((c) => (
            <li
              key={c.id}
              className="rounded-md border border-[var(--vision-line)] bg-white/80 px-2 py-1 text-[10px] font-semibold text-[var(--vision-ink)]"
              title={c.role}
            >
              {c.short}
            </li>
          ))}
        </ul>
      ) : null}

      {exposure.timeSavings?.label ? (
        <p className="rounded-lg bg-[rgba(3,199,90,0.1)] px-3 py-2 text-[12px] font-medium text-[#027A48]">
          {exposure.timeSavings.label}
        </p>
      ) : null}

      {exposure.dna?.labels?.length ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="콘텐츠 DNA">
          {exposure.dna.labels.map((d) => (
            <li
              key={d.id}
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
                d.avoid
                  ? "bg-[#FFF1F0] text-[#D14343]"
                  : "bg-white text-[var(--vision-muted)] border border-[var(--vision-line)]"
              }`}
            >
              {d.label}
            </li>
          ))}
        </ul>
      ) : null}

      {exposure.operatingItems?.length ? (
        <ul className="space-y-1.5">
          {exposure.operatingItems.map((item) => (
            <li
              key={`${item.channel}-${item.topic}`}
              className="rounded-lg bg-white/80 px-3 py-2 text-[12px] leading-relaxed text-[var(--vision-ink)]"
            >
              <span className="font-semibold text-[var(--vision-accent,#03A94D)]">
                {item.channel}
              </span>
              <span> — {item.topic}</span>
              {item.reason ? (
                <p className="mt-0.5 text-[11px] text-[var(--vision-muted)]">{item.reason}</p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {exposure.researchLines?.length ? (
        <div>
          <p className="text-[11px] font-semibold text-[var(--vision-muted)]">
            조사에서 본문에 반영한 내용
          </p>
          <ul className="mt-1.5 space-y-1">
            {exposure.researchLines.map((line) => (
              <li
                key={line.slice(0, 24)}
                className="text-[12px] leading-relaxed text-[var(--vision-ink)] before:mr-1.5 before:text-[var(--vision-accent)] before:content-['·']"
              >
                {line}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {exposure.explainLine ? (
        <p className="rounded-lg border border-[var(--vision-line)] bg-white/70 px-3 py-2 text-[12px] leading-relaxed text-[var(--vision-ink)]">
          <span className="font-semibold text-[var(--vision-muted)]">독자가 얻는 것 · </span>
          {exposure.explainLine}
        </p>
      ) : null}

      {exposure.checks?.length ? (
        <ul className="flex flex-wrap gap-2">
          {exposure.checks.map((c) => (
            <li
              key={c.id}
              className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                c.ok
                  ? "bg-[rgba(3,199,90,0.12)] text-[#027A48]"
                  : "bg-[#F7F8FA] text-[var(--vision-muted)]"
              }`}
            >
              {c.ok ? "✓" : "○"} {c.label}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
