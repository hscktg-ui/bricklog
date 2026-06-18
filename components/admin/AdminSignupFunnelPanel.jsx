"use client";

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
        <span className="font-medium text-[#191F28]">{label}</span>
        <span className="tabular-nums text-[#4E5968]">
          {value ?? "—"}
          {hint ? <span className="ml-1 text-[#8B95A1]">{hint}</span> : null}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#F2F4F6]">
        <div
          className="h-full rounded-full bg-[#3182F6] transition-all"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function PeriodBlock({ title, data }) {
  if (!data) return null;
  const max =
    data.uniqueVisitors ||
    data.signupIntents ||
    data.funnel?.modalOpen ||
    data.signups ||
    1;

  return (
    <div className="rounded-xl border border-[#E8EBED] bg-white p-4">
      <h3 className="text-[15px] font-bold text-[#191F28]">{title}</h3>
      <div className="mt-4 space-y-3">
        <FunnelBar label="순방문" value={data.uniqueVisitors} max={max} />
        <FunnelBar
          label="가입 CTA 클릭"
          value={data.signupIntents}
          max={max}
          hint={
            data.rates?.visitorToIntentPct != null
              ? `(${pct(data.rates.visitorToIntentPct)} of UV)`
              : null
          }
        />
        <FunnelBar
          label="가입 모달 열림"
          value={data.funnel?.modalOpen}
          max={max}
          hint={
            data.rates?.intentToModalPct != null
              ? `(${pct(data.rates.intentToModalPct)} of CTA)`
              : null
          }
        />
        <FunnelBar
          label="가입 폼 제출"
          value={data.funnel?.formSubmit}
          max={max}
          hint={
            data.rates?.modalToSubmitPct != null
              ? `(${pct(data.rates.modalToSubmitPct)} of modal)`
              : null
          }
        />
        <FunnelBar
          label="가입 완료 (profiles)"
          value={data.signups}
          max={max}
          hint={
            data.rates?.visitorToSignupPct != null
              ? `(${pct(data.rates.visitorToSignupPct)} of UV)`
              : null
          }
        />
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <p className="rounded-lg bg-[#F7F8FA] px-3 py-2 text-[11px] text-[#4E5968]">
          CTA→가입{" "}
          <strong className="text-[#191F28]">
            {pct(data.rates?.intentToSignupPct)}
          </strong>
        </p>
        <p className="rounded-lg bg-[#F7F8FA] px-3 py-2 text-[11px] text-[#4E5968]">
          제출→가입{" "}
          <strong className="text-[#191F28]">
            {pct(data.rates?.submitToSignupPct)}
          </strong>
        </p>
      </div>

      {data.intentBySource?.length > 0 && (
        <div className="mt-4">
          <p className="text-[12px] font-semibold text-[#4E5968]">CTA 출처</p>
          <ul className="mt-2 space-y-1">
            {data.intentBySource.map((row) => (
              <li
                key={row.label}
                className="flex justify-between text-[11px] text-[#4E5968]"
              >
                <span className="truncate pr-2">{row.label}</span>
                <span className="tabular-nums font-medium">{row.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.truncated && (
        <p className="mt-3 text-[11px] text-amber-800">
          일부 행만 집계됐습니다. 트래픽이 많으면 Admin fetch limit 내에서
          근사치입니다.
        </p>
      )}
    </div>
  );
}

export default function AdminSignupFunnelPanel({ funnel }) {
  if (!funnel) {
    return (
      <p className="text-[13px] text-[#8B95A1]">가입 퍼널 집계를 불러오는 중…</p>
    );
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-[16px] font-bold text-[#191F28]">가입 퍼널</h2>
        <p className="mt-0.5 text-[11px] text-[#8B95A1]">
          방문 → CTA → 모달 → 제출 → profiles 가입 · KST 기준
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <PeriodBlock title="오늘" data={funnel.today} />
        <PeriodBlock title="최근 7일" data={funnel.last7d} />
      </div>
      {funnel.last7d?.incompleteProfiles > 0 && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
          프로필 미완료 {funnel.last7d.incompleteProfiles}명 — 닉네임·추가 정보
          단계에서 이탈 중일 수 있습니다.
        </p>
      )}
      {funnel.hints?.length > 0 && (
        <ul className="list-disc pl-5 text-[11px] leading-relaxed text-[#8B95A1]">
          {funnel.hints.map((hint) => (
            <li key={hint}>{hint}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
