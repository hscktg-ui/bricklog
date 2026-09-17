"use client";

import {
  ADMIN_CTA_ACCENT,
  ADMIN_EYEBROW,
  ADMIN_GHOST_BTN,
  ADMIN_PANEL,
} from "@/lib/admin/adminVision2030Styles";

const PULSE_STYLES = {
  ok: {
    ring: "border-[var(--admin-accent-ring,rgba(3,199,90,0.28))] bg-gradient-to-br from-[var(--admin-accent-soft,rgba(3,199,90,0.08))] via-white to-white",
    dot: "bg-[var(--admin-accent-deep,#03a94d)]",
    label: "text-[var(--admin-accent-deep,#03a94d)]",
  },
  watch: {
    ring: "border-amber-400/35 bg-gradient-to-br from-amber-50 via-white to-white",
    dot: "bg-amber-500",
    label: "text-amber-700",
  },
  urgent: {
    ring: "border-[#E42939]/30 bg-gradient-to-br from-[#FFF0F0] via-white to-white",
    dot: "bg-[#E42939]",
    label: "text-[#E42939]",
  },
};

/**
 * Admin editorial command center — Jobs: one verdict · Cook: landing density.
 * Sentence + inline metrics + action buttons (no card grid).
 */
export default function AdminCommandCenter({
  view,
  loading = false,
  onNavigateSection,
  onRunTrend,
}) {
  if (loading && !view) {
    return (
      <section className={`${ADMIN_PANEL} mb-6 p-8`}>
        <p className="text-[14px] text-[var(--admin-muted,#5F6B66)]">현황을 정리하는 중…</p>
      </section>
    );
  }

  if (!view) return null;

  const pulse = PULSE_STYLES[view.pulse] || PULSE_STYLES.ok;
  const metricLine = (view.signals || [])
    .slice(0, 4)
    .map((s) => `${s.label} ${s.value}`)
    .join(" · ");
  const channelLine = (view.channels || [])
    .filter((ch) => ch.passRate != null)
    .map((ch) => `${ch.label} ${ch.passRate}%`)
    .join(" · ");
  const verdict =
    view.nowActions?.[0]?.title ||
    view.topAlert ||
    view.headline ||
    "오늘 운영 상태를 확인하세요.";

  return (
    <section
      className={`mb-6 overflow-hidden rounded-[1.75rem] border p-6 shadow-sm md:p-8 ${pulse.ring}`}
      data-briclog-admin="command-center"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl flex-1">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${pulse.dot}`} />
            <span className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${pulse.label}`}>
              {view.pulseLabel}
            </span>
          </div>
          <h2 className="mt-3 text-[clamp(1.35rem,3vw,1.75rem)] font-semibold leading-snug tracking-[-0.03em] text-[var(--admin-ink,#111111)]">
            {verdict}
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-[var(--admin-muted,#5F6B66)]">
            {view.subline}
            {view.readiness != null ? ` · 준비도 ${view.readiness}` : ""}
          </p>
          {metricLine ? (
            <p className="mt-3 text-[13px] leading-relaxed text-[var(--admin-ink,#111111)]">
              {metricLine}
            </p>
          ) : null}
          {channelLine ? (
            <p className="mt-1 text-[12px] text-[var(--admin-muted,#5F6B66)]">
              배치 · {channelLine}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          className={ADMIN_CTA_ACCENT}
          onClick={() => onNavigateSection?.("quality")}
        >
          품질 보기
        </button>
        <button
          type="button"
          className={ADMIN_GHOST_BTN}
          onClick={() => onNavigateSection?.("growth")}
        >
          유입 보기
        </button>
        <button
          type="button"
          className={ADMIN_GHOST_BTN}
          onClick={() => onNavigateSection?.("system")}
        >
          시스템
        </button>
        {typeof onRunTrend === "function" ? (
          <button type="button" className={ADMIN_GHOST_BTN} onClick={() => void onRunTrend()}>
            RUN NOW
          </button>
        ) : null}
      </div>

      {view.nowActions?.length > 1 ? (
        <div className="mt-5 border-t border-[var(--admin-line,rgba(17,17,17,0.08))] pt-4">
          <p className={ADMIN_EYEBROW}>다음</p>
          <ul className="mt-2 space-y-2">
            {view.nowActions.slice(1, 2).map((action) => (
              <li key={action.id} className="text-[13px] leading-relaxed text-[var(--admin-ink,#111111)]">
                {action.title}
              </li>
            ))}
          </ul>
        </div>
      ) : view.watchCount > 0 && !(view.nowActions?.length > 0) ? (
        <p className="mt-5 text-[12px] text-[var(--admin-muted,#5F6B66)]">
          관찰·이번 주 항목 {view.watchCount}건 — 품질 탭에서 확인
        </p>
      ) : null}
    </section>
  );
}
