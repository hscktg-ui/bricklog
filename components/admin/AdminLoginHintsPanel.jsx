"use client";

import { hintForLoginFail, labelLoginSource } from "@/lib/admin/ctaSourceLabels";
import {
  ADMIN_PANEL,
  ADMIN_SIGNAL_ACCENT,
  ADMIN_SUB,
} from "@/lib/admin/adminVision2030Styles";

function MetricPill({ label, value, accent = false }) {
  return (
    <div className={accent ? ADMIN_SIGNAL_ACCENT : `${ADMIN_PANEL} px-3 py-2.5`}>
      <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--admin-muted,#5a6b62)]">
        {label}
      </p>
      <p className="mt-0.5 text-[20px] font-bold text-[var(--admin-ink,#0f1a14)]">{value}</p>
    </div>
  );
}

function FailReasonList({ rows = [] }) {
  if (!rows.length) {
    return (
      <p className={`${ADMIN_SUB} text-[12px]`}>
        오늘 기록된 로그인 실패가 없습니다. (배포 후 AuthForm에서 집계)
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li
          key={row.label}
          className="rounded-xl border border-[var(--admin-line,rgba(15,26,20,0.08))] bg-[var(--admin-paper,#f7faf8)] px-3 py-2.5"
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[13px] font-semibold text-[var(--admin-ink,#0f1a14)]">
              {row.label.replace(/_/g, " ")}
            </span>
            <span className="tabular-nums text-[12px] font-medium text-[var(--admin-muted,#5a6b62)]">
              {row.count}회
            </span>
          </div>
          <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--admin-muted,#5a6b62)]">
            {hintForLoginFail(row.label)}
          </p>
        </li>
      ))}
    </ul>
  );
}

/** 로그인 실패·출처 — 운영 힌트 */
export default function AdminLoginHintsPanel({ funnel, compact = false }) {
  const login = funnel?.login;
  const today = login?.today;
  const week = login?.last7d;

  if (!login) {
    return (
      <p className={`${ADMIN_SUB} mb-6 text-[12px]`}>로그인 집계를 불러오는 중…</p>
    );
  }

  if (compact) {
    const fails = today?.loginFailures ?? 0;
    const attempts = today?.loginAttempts ?? 0;
    if (!attempts && !fails) return null;
    return (
      <p className="mb-4 text-[12px] text-[var(--admin-muted,#5a6b62)]">
        오늘 로그인 {attempts}회 · 실패 {fails}회
        {today?.failRatePct != null ? ` (${today.failRatePct}%)` : ""}
      </p>
    );
  }

  const topReason = today?.failByReason?.[0];
  const topSource = today?.failBySource?.[0];

  return (
    <section className="mb-6 space-y-3">
      <div>
        <h2 className="text-[16px] font-semibold text-[var(--admin-ink,#0f1a14)]">
          로그인 · 실패 힌트
        </h2>
        <p className="mt-0.5 text-[11px] text-[var(--admin-muted,#5a6b62)]">
          __intent/login:* 시도 · __funnel/login_fail:코드:출처
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MetricPill label="오늘 시도" value={today?.loginAttempts ?? "—"} accent />
        <MetricPill label="오늘 실패" value={today?.loginFailures ?? "—"} />
        <MetricPill
          label="실패율"
          value={today?.failRatePct != null ? `${today.failRatePct}%` : "—"}
        />
        <MetricPill label="7일 실패" value={week?.loginFailures ?? "—"} />
      </div>

      {(topReason || topSource) && (
        <div className={`${ADMIN_PANEL} px-4 py-3 text-[12px] text-[var(--admin-muted,#5a6b62)]`}>
          {topReason ? (
            <p>
              오늘 1위 실패 · <strong className="text-[var(--admin-ink,#0f1a14)]">{topReason.label}</strong>{" "}
              ({topReason.count}) — {hintForLoginFail(topReason.label)}
            </p>
          ) : null}
          {topSource ? (
            <p className={topReason ? "mt-1" : ""}>
              출처 ·{" "}
              <strong className="text-[var(--admin-ink,#0f1a14)]">
                {topSource.displayLabel || labelLoginSource(topSource.label)}
              </strong>
            </p>
          ) : null}
        </div>
      )}

      <div className={`${ADMIN_PANEL} p-4`}>
        <h3 className="text-[14px] font-semibold text-[var(--admin-ink,#0f1a14)]">
          실패 사유 (오늘)
        </h3>
        <div className="mt-3">
          <FailReasonList rows={today?.failByReason || []} />
        </div>
      </div>

      {(today?.failBySource?.length ?? 0) > 0 && (
        <div className={`${ADMIN_PANEL} p-4`}>
          <h3 className="text-[14px] font-semibold text-[var(--admin-ink,#0f1a14)]">
            실패 출처 (오늘)
          </h3>
          <ul className="mt-3 space-y-1.5">
            {today.failBySource.map((row) => (
              <li
                key={row.label}
                className="flex justify-between text-[12px] text-[var(--admin-muted,#5a6b62)]"
              >
                <span>{row.displayLabel || labelLoginSource(row.label)}</span>
                <span className="tabular-nums font-medium">{row.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
