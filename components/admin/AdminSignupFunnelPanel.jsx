"use client";

import {
  ADMIN_PANEL,
  ADMIN_SUB,
} from "@/lib/admin/adminVision2030Styles";

function pct(value) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value}%`;
}

function FunnelBar({ label, value, max, hint }) {
  const width =
    max > 0 && value != null ? Math.max(4, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-[12px]">
        <span className="font-medium text-[var(--admin-ink,#0f1a14)]">{label}</span>
        <span className="tabular-nums text-[var(--admin-muted,#5a6b62)]">
          {value ?? "—"}
          {hint ? <span className="ml-1 text-[var(--admin-muted,#5a6b62)]/80">{hint}</span> : null}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--admin-paper,#f7faf8)]">
        <div
          className="h-full rounded-full bg-[var(--admin-accent-deep,#03a94d)] transition-all"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function PeriodBlock({ title, data, dense = false }) {
  if (!data) return null;
  const max =
    data.uniqueVisitors ||
    data.signupIntents ||
    data.funnel?.modalOpen ||
    data.signups ||
    1;

  return (
    <div className={`${ADMIN_PANEL} p-4`}>
      <h3 className="text-[15px] font-semibold text-[var(--admin-ink,#0f1a14)]">{title}</h3>
      <div className={`mt-4 space-y-3 ${dense ? "space-y-2.5" : ""}`}>
        <FunnelBar label="순방문" value={data.uniqueVisitors} max={max} />
        <FunnelBar
          label="무료 시작·가입 CTA"
          value={data.signupIntents}
          max={max}
          hint={
            data.rates?.visitorToIntentPct != null
              ? `(${pct(data.rates.visitorToIntentPct)} UV)`
              : null
          }
        />
        <FunnelBar
          label="가입 모달"
          value={data.funnel?.modalOpen}
          max={max}
          hint={
            data.rates?.intentToModalPct != null
              ? `(${pct(data.rates.intentToModalPct)} CTA)`
              : null
          }
        />
        {!dense ? (
          <>
            <FunnelBar
              label="가입 폼 제출"
              value={data.funnel?.formSubmit}
              max={max}
              hint={
                data.rates?.modalToSubmitPct != null
                  ? `(${pct(data.rates.modalToSubmitPct)} modal)`
                  : null
              }
            />
            <FunnelBar
              label="가입 완료"
              value={data.signups}
              max={max}
              hint={
                data.rates?.visitorToSignupPct != null
                  ? `(${pct(data.rates.visitorToSignupPct)} UV)`
                  : null
              }
            />
          </>
        ) : (
          <FunnelBar
            label="가입 완료"
            value={data.signups}
            max={max}
            hint={
              data.rates?.visitorToSignupPct != null
                ? `(${pct(data.rates.visitorToSignupPct)} UV)`
                : null
            }
          />
        )}
      </div>

      <div className={`mt-4 grid gap-2 ${dense ? "grid-cols-2" : "sm:grid-cols-2"}`}>
        <p className="rounded-lg bg-[var(--admin-paper,#f7faf8)] px-3 py-2 text-[11px] text-[var(--admin-muted,#5a6b62)]">
          CTA→가입{" "}
          <strong className="text-[var(--admin-ink,#0f1a14)]">
            {pct(data.rates?.intentToSignupPct)}
          </strong>
        </p>
        <p className="rounded-lg bg-[var(--admin-paper,#f7faf8)] px-3 py-2 text-[11px] text-[var(--admin-muted,#5a6b62)]">
          UV→가입{" "}
          <strong className="text-[var(--admin-ink,#0f1a14)]">
            {pct(data.rates?.visitorToSignupPct)}
          </strong>
        </p>
      </div>

      {!dense && data.intentBySource?.length > 0 && (
        <div className="mt-4">
          <p className="text-[12px] font-semibold text-[var(--admin-muted,#5a6b62)]">CTA 출처</p>
          <ul className="mt-2 space-y-1">
            {data.intentBySource.map((row) => (
              <li
                key={row.label}
                className="flex justify-between text-[11px] text-[var(--admin-muted,#5a6b62)]"
              >
                <span className="truncate pr-2">{row.label}</span>
                <span className="tabular-nums font-medium">{row.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function AdminSignupFunnelPanel({ funnel, compact = false }) {
  if (!funnel) {
    return (
      <p className={`${ADMIN_SUB} mb-6`}>가입 퍼널 집계를 불러오는 중…</p>
    );
  }

  if (compact) {
    return (
      <section className="mb-6 space-y-3">
        <div>
          <h2 className="text-[16px] font-semibold text-[var(--admin-ink,#0f1a14)]">
            오늘 가입 퍼널
          </h2>
          <p className="mt-0.5 text-[11px] text-[var(--admin-muted,#5a6b62)]">
            방문 → 무료 시작 CTA → 모달 → 가입 · KST
          </p>
        </div>
        <PeriodBlock title="오늘" data={funnel.today} dense />
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-[16px] font-semibold text-[var(--admin-ink,#0f1a14)]">가입 퍼널</h2>
        <p className="mt-0.5 text-[11px] text-[var(--admin-muted,#5a6b62)]">
          방문 → 무료 시작 CTA → 모달 → 제출 → profiles · KST
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <PeriodBlock title="오늘" data={funnel.today} />
        <PeriodBlock title="최근 7일" data={funnel.last7d} />
      </div>
      {funnel.last7d?.incompleteProfiles > 0 && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
          프로필 미완료 {funnel.last7d.incompleteProfiles}명 — 닉네임·추가 정보 단계 이탈 가능
        </p>
      )}
      {funnel.hints?.length > 0 && (
        <ul className="list-disc pl-5 text-[11px] leading-relaxed text-[var(--admin-muted,#5a6b62)]">
          {funnel.hints.map((hint) => (
            <li key={hint}>{hint}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
