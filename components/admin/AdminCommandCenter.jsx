"use client";

const PULSE_STYLES = {
  ok: {
    ring: "border-[#03A94D]/40 bg-gradient-to-br from-[#03C75A]/12 via-white to-white",
    dot: "bg-[#03A94D]",
    label: "text-[#03A94D]",
  },
  watch: {
    ring: "border-amber-400/40 bg-gradient-to-br from-amber-50 via-white to-white",
    dot: "bg-amber-500",
    label: "text-amber-700",
  },
  urgent: {
    ring: "border-[#E42939]/35 bg-gradient-to-br from-[#FFF0F0] via-white to-white",
    dot: "bg-[#E42939]",
    label: "text-[#E42939]",
  },
};

function ChannelTile({ ch }) {
  const pct = ch.passRate ?? 0;
  const target = ch.target ?? 90;
  const barColor =
    ch.status === "ok"
      ? "bg-[#03A94D]"
      : ch.status === "warn"
        ? "bg-amber-500"
        : ch.status === "fail"
          ? "bg-[#E42939]"
          : "bg-[#D1D6DB]";

  return (
    <div className="rounded-2xl border border-[#E8EBED]/80 bg-white/80 p-4 backdrop-blur-sm">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[12px] font-medium text-[#4E5968]">{ch.label}</p>
        {ch.fraction ? (
          <p className="text-[10px] text-[#8B95A1]">{ch.fraction}</p>
        ) : null}
      </div>
      <p className="mt-2 text-[28px] font-bold tracking-tight text-[#191F28]">
        {ch.passRate != null ? `${ch.passRate}%` : "—"}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#F2F4F6]">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <p className="mt-1.5 text-[10px] text-[#8B95A1]">목표 {target}%</p>
    </div>
  );
}

function SignalPill({ signal }) {
  const tone =
    signal.tone === "urgent"
      ? "border-[#E42939]/25 bg-[#FFF5F5]"
      : signal.tone === "watch"
        ? "border-amber-200 bg-amber-50/80"
        : "border-[#E8EBED] bg-white/90";

  return (
    <div className={`rounded-xl border px-3 py-2.5 ${tone}`}>
      <p className="text-[10px] font-medium uppercase tracking-wide text-[#8B95A1]">
        {signal.label}
      </p>
      <p className="mt-0.5 text-[20px] font-bold text-[#191F28]">{signal.value}</p>
    </div>
  );
}

/**
 * @param {{ view?: ReturnType<typeof import("@/lib/admin/buildAdminCommandCenter").buildAdminCommandCenter> | null, loading?: boolean }} props
 */
export default function AdminCommandCenter({ view, loading = false }) {
  if (loading && !view) {
    return (
      <section className="mb-6 rounded-3xl border border-[#E8EBED] bg-white p-8">
        <p className="text-[14px] text-[#8B95A1]">현황을 정리하는 중…</p>
      </section>
    );
  }

  if (!view) return null;

  const pulse = PULSE_STYLES[view.pulse] || PULSE_STYLES.ok;

  return (
    <section
      className={`mb-6 overflow-hidden rounded-3xl border p-6 shadow-sm md:p-8 ${pulse.ring}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${pulse.dot}`} />
            <span className={`text-[12px] font-semibold uppercase tracking-widest ${pulse.label}`}>
              {view.pulseLabel}
            </span>
          </div>
          <h2 className="mt-3 max-w-2xl text-[22px] font-bold leading-snug tracking-tight text-[#191F28] md:text-[26px]">
            {view.headline}
          </h2>
          <p className="mt-2 text-[13px] text-[#4E5968]">{view.subline}</p>
          {view.topAlert ? (
            <p className="mt-3 max-w-2xl rounded-xl bg-white/70 px-3 py-2 text-[12px] text-[#4E5968]">
              {view.topAlert}
            </p>
          ) : null}
        </div>

        {view.readiness != null && (
          <div className="shrink-0 rounded-2xl border border-[#E8EBED] bg-white px-5 py-4 text-center shadow-sm">
            <p className="text-[10px] font-medium uppercase tracking-wide text-[#8B95A1]">
              준비도
            </p>
            <p className="mt-1 text-[36px] font-bold leading-none text-[#191F28]">
              {view.readiness}
            </p>
            {view.readinessBand ? (
              <p className="mt-1 text-[11px] text-[#4E5968]">{view.readinessBand}</p>
            ) : null}
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {(view.channels || []).map((ch) => (
          <ChannelTile key={ch.id} ch={ch} />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {(view.signals || []).map((s) => (
          <SignalPill key={s.id} signal={s} />
        ))}
      </div>

      {view.nowActions?.length > 0 ? (
        <ul className="mt-5 space-y-2">
          {view.nowActions.map((action) => (
            <li
              key={action.id}
              className="flex flex-wrap items-start gap-3 rounded-2xl border border-[#E42939]/20 bg-white/90 px-4 py-3"
            >
              <span className="shrink-0 rounded-full bg-[#E42939] px-2 py-0.5 text-[10px] font-bold text-white">
                지금
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-[#191F28]">{action.title}</p>
                <p className="mt-0.5 text-[12px] text-[#4E5968]">{action.advice}</p>
                {action.action ? (
                  <p className="mt-1 text-[11px] text-[#8B95A1]">{action.action}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : view.watchCount > 0 ? (
        <p className="mt-5 text-[12px] text-[#8B95A1]">
          관찰·이번 주 항목 {view.watchCount}건 — 품질 탭에서 확인
        </p>
      ) : null}
    </section>
  );
}
