"use client";

import { labelSignupSource } from "@/lib/admin/ctaSourceLabels";
import {
  ADMIN_PANEL,
  ADMIN_SUB,
} from "@/lib/admin/adminVision2030Styles";

function SourceBars({ title, rows = [], maxCount }) {
  const max = maxCount || rows[0]?.count || 1;

  return (
    <div className={`${ADMIN_PANEL} p-4`}>
      <h3 className="text-[14px] font-semibold text-[var(--admin-ink,#0f1a14)]">{title}</h3>
      {rows.length === 0 ? (
        <p className={`${ADMIN_SUB} mt-3 text-[12px]`}>아직 집계된 클릭이 없습니다.</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {rows.map((row) => {
            const width =
              max > 0 && row.count != null
                ? Math.max(6, Math.round((row.count / max) * 100))
                : 0;
            const label = row.displayLabel || labelSignupSource(row.label);
            return (
              <li key={row.label}>
                <div className="flex items-baseline justify-between gap-2 text-[12px]">
                  <span className="min-w-0 truncate font-medium text-[var(--admin-ink,#0f1a14)]">
                    {label}
                  </span>
                  <span className="shrink-0 tabular-nums text-[var(--admin-muted,#5a6b62)]">
                    {row.count}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--admin-paper,#f7faf8)]">
                  <div
                    className="h-full rounded-full bg-[var(--admin-accent-deep,#03a94d)]"
                    style={{ width: `${width}%` }}
                  />
                </div>
                <p className="mt-0.5 text-[10px] text-[var(--admin-muted,#5a6b62)]/80">
                  {row.label}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** 가입 CTA 출처 — today / 7d */
export default function AdminCtaSourcePanel({ funnel, compact = false }) {
  const today = funnel?.today?.intentBySource || [];
  const week = funnel?.last7d?.intentBySource || [];
  const maxToday = today[0]?.count || 1;
  const maxWeek = week[0]?.count || 1;

  if (compact) {
    const top = today[0];
    if (!top) return null;
    return (
      <p className="mb-4 text-[12px] text-[var(--admin-muted,#5a6b62)]">
        오늘 CTA 1위 ·{" "}
        <strong className="text-[var(--admin-ink,#0f1a14)]">
          {top.displayLabel || labelSignupSource(top.label)}
        </strong>{" "}
        ({top.count})
      </p>
    );
  }

  return (
    <section className="mb-6 space-y-3">
      <div>
        <h2 className="text-[16px] font-semibold text-[var(--admin-ink,#0f1a14)]">
          가입 CTA 출처
        </h2>
        <p className="mt-0.5 text-[11px] text-[var(--admin-muted,#5a6b62)]">
          랜딩·샘플·OAuth — __intent/signup:* 경로
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SourceBars title="오늘" rows={today} maxCount={maxToday} />
        <SourceBars title="최근 7일" rows={week} maxCount={maxWeek} />
      </div>
    </section>
  );
}
