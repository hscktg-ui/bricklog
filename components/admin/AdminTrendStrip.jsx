"use client";

import {
  ADMIN_EYEBROW,
  ADMIN_GHOST_BTN,
  ADMIN_PANEL,
} from "@/lib/admin/adminVision2030Styles";

/**
 * Compact trend strip for Today tab — status before inflow.
 * @param {{
 *   trendSystem?: object|null,
 *   onOpenSystem?: () => void,
 *   onRunTrend?: () => void,
 * }} props
 */
export default function AdminTrendStrip({
  trendSystem = null,
  onOpenSystem,
  onRunTrend,
}) {
  if (!trendSystem) {
    return (
      <section className={`${ADMIN_PANEL} mb-6 p-5`} data-briclog-admin="trend-strip">
        <p className={ADMIN_EYEBROW}>Trend System</p>
        <p className="mt-2 text-[14px] text-[var(--admin-muted,#5F6B66)]">
          트렌드 파이프라인 상태를 불러오는 중이거나, 아직 집계가 없습니다.
        </p>
      </section>
    );
  }

  const lastUpdate = trendSystem.lastUpdate
    ? new Date(trendSystem.lastUpdate).toLocaleString("ko-KR", {
        timeZone: "Asia/Seoul",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
  const sources = `${trendSystem.sourcesOnline ?? 0} / ${trendSystem.sourcesTotal ?? 0}`;

  return (
    <section className={`${ADMIN_PANEL} mb-6 p-5`} data-briclog-admin="trend-strip">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-xl">
          <p className={ADMIN_EYEBROW}>Trend System</p>
          <h2 className="mt-1.5 text-[17px] font-semibold tracking-[-0.02em] text-[var(--admin-ink,#111111)]">
            오늘 트렌드 파이프라인
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--admin-muted,#5F6B66)]">
            상태 {trendSystem.status || "—"} · 소스 {sources} · 마지막 {lastUpdate}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {typeof onRunTrend === "function" ? (
            <button type="button" className={ADMIN_GHOST_BTN} onClick={() => void onRunTrend()}>
              지금 트렌드 갱신
            </button>
          ) : null}
          {typeof onOpenSystem === "function" ? (
            <button type="button" className={ADMIN_GHOST_BTN} onClick={onOpenSystem}>
              상세 보기
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
