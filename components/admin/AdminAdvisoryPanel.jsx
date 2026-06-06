"use client";

const PRIORITY_STYLES = {
  now: "border-[#E42939]/30 bg-[#FFF5F5]",
  soon: "border-[#3182F6]/25 bg-[#F0F6FF]",
  watch: "border-[#E8EBED] bg-[#FAFBFC]",
};

const PRIORITY_LABELS = {
  now: "지금",
  soon: "이번 주",
  watch: "관찰",
};

export default function AdminAdvisoryPanel({
  advisory,
  loading,
  insights = [],
  insightsLoading,
  onRefreshInsights,
  onApproveInsight,
}) {
  if (loading) {
    return (
      <section className="mb-6 rounded-2xl border border-[#E8EBED] bg-white p-6">
        <p className="text-[14px] text-[#8B95A1]">운영 조언을 불러오는 중…</p>
      </section>
    );
  }

  if (!advisory) {
    return (
      <section className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <p className="text-[13px] text-amber-900">
          조언 데이터를 불러오지 못했습니다. 새로고침하거나 서비스 역할 키를 확인하세요.
        </p>
      </section>
    );
  }

  const { funnel, actions, quality, engineOps, readinessGaps } = advisory;

  return (
    <section className="mb-6 space-y-4">
      <div className="rounded-2xl border border-[#03A94D]/30 bg-gradient-to-br from-[#03C75A]/8 to-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#03A94D]">
              운영 조언
            </p>
            <h2 className="mt-1 text-[18px] font-bold leading-snug text-[#191F28]">
              {advisory.headline}
            </h2>
            <p className="mt-2 text-[12px] text-[#8B95A1]">
              {funnel?.introNote}
            </p>
          </div>
          {advisory.healthScore != null && (
            <div className="rounded-xl border border-[#E8EBED] bg-white px-4 py-3 text-center">
              <p className="text-[10px] text-[#8B95A1]">제품 준비도</p>
              <p className="text-[22px] font-bold text-[#191F28]">
                {advisory.healthScore}
              </p>
              {advisory.healthBand && (
                <p className="text-[10px] text-[#4E5968]">{advisory.healthBand}</p>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FunnelStat
            label="오늘 방문"
            value={funnel?.visitsToday ?? "—"}
            hint="site_visits"
          />
          <FunnelStat
            label="오늘 가입"
            value={funnel?.signupsToday ?? "—"}
            hint="가입 흐름 유지"
          />
          <FunnelStat
            label="7일 샘플 성공"
            value={funnel?.sampleRuns7d ?? 0}
            hint="발행 샘플 바로보기"
          />
          <FunnelStat
            label="30일 가입"
            value={funnel?.signups30d ?? 0}
            hint={
              funnel?.sampleToSignupPct != null
                ? `샘플 대비 ${funnel.sampleToSignupPct}%`
                : "전환 관찰"
            }
          />
        </div>
      </div>

      {actions?.length > 0 && (
        <div className="rounded-2xl border border-[#E8EBED] bg-white p-5">
          <h3 className="text-[15px] font-bold text-[#191F28]">할 일 · 우선순위</h3>
          <ul className="mt-3 space-y-2">
            {actions.map((item) => (
              <li
                key={item.id}
                className={`rounded-xl border p-4 ${PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.watch}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-[#4E5968]">
                    {PRIORITY_LABELS[item.priority] || "관찰"}
                  </span>
                  <p className="text-[13px] font-semibold text-[#191F28]">{item.title}</p>
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-[#4E5968]">
                  {item.advice}
                </p>
                {item.action && (
                  <p className="mt-2 text-[12px] font-medium text-[#03A94D]">
                    → {item.action}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(advisory.topTopics?.length > 0 || advisory.topBrands?.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {advisory.topBrands?.length > 0 && (
            <TopicList title="인기 샘플 브랜드 (30일)" items={advisory.topBrands} />
          )}
          {advisory.topTopics?.length > 0 && (
            <TopicList title="인기 샘플 주제 (30일)" items={advisory.topTopics} />
          )}
        </div>
      )}

      <div className="rounded-2xl border border-[#E8EBED] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[15px] font-bold text-[#191F28]">전역 품질 인사이트</h3>
          <button
            type="button"
            onClick={() => onRefreshInsights?.(true)}
            disabled={insightsLoading}
            className="rounded-lg border border-[#E8EBED] px-3 py-1.5 text-[12px] disabled:opacity-50"
          >
            후보 갱신
          </button>
        </div>
        <p className="mt-1 text-[12px] text-[#8B95A1]">
          승인 시 엔진 규칙에 반영 · 대기 {quality?.pendingInsights ?? 0}건
        </p>
        <ul className="mt-3 space-y-2">
          {insights.length === 0 && (
            <li className="text-[12px] text-[#8B95A1]">대기 중인 인사이트 없음</li>
          )}
          {insights.map((ins) => (
            <li
              key={ins.id}
              className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-[#E8EBED] p-3 text-[12px]"
            >
              <div>
                <p className="font-semibold text-[#191F28]">{ins.insight_type}</p>
                <p className="mt-1 text-[#4E5968]">
                  {ins.payload?.message || ins.payload?.suggestedAction || "—"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onApproveInsight?.(ins.id)}
                className="shrink-0 rounded-lg bg-[#03C75A] px-3 py-1 text-[12px] font-medium text-white"
              >
                승인
              </button>
            </li>
          ))}
        </ul>
      </div>

      {(engineOps?.notes?.length > 0 || readinessGaps?.length > 0) && (
        <div className="rounded-xl border border-[#E8EBED] bg-[#FAFBFC] p-4 text-[12px] text-[#4E5968]">
          <p className="font-semibold text-[#191F28]">참고</p>
          {engineOps?.ok === false && (
            <p className="mt-1 text-amber-800">엔진·스키마 일부 미충족</p>
          )}
          {readinessGaps?.map((g) => (
            <p key={g.id} className="mt-1">
              · {g.label}: {g.note || `${g.pct}%`}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}

function FunnelStat({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-[#E8EBED]/80 bg-white/90 px-3 py-2.5">
      <p className="text-[10px] text-[#8B95A1]">{label}</p>
      <p className="text-[18px] font-bold text-[#191F28]">{value}</p>
      {hint && <p className="text-[10px] text-[#8B95A1]">{hint}</p>}
    </div>
  );
}

function TopicList({ title, items }) {
  return (
    <div className="rounded-xl border border-[#E8EBED] bg-white p-4">
      <p className="text-[13px] font-semibold text-[#191F28]">{title}</p>
      <ul className="mt-2 space-y-1 text-[12px] text-[#4E5968]">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`}>
            {item.label}{" "}
            <span className="text-[#8B95A1]">({item.count})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
