"use client";

function formatKst(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function StatusDot({ status }) {
  const cls =
    status === "ok"
      ? "bg-[#03A94D]"
      : status === "warn"
        ? "bg-amber-500"
        : status === "fail"
          ? "bg-[#D32D2F]"
          : "bg-[#8B95A1]";
  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${cls}`} />;
}

function PassBar({ passRate, target, label }) {
  const pct = passRate ?? 0;
  const targetPct = target ?? 90;
  return (
    <div>
      <div className="flex items-center justify-between text-[12px]">
        <span className="font-medium text-[#191F28]">{label}</span>
        <span className="text-[#4E5968]">
          {passRate != null ? `${passRate}%` : "—"}
          <span className="text-[#8B95A1]"> / 목표 {targetPct}%</span>
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#F2F4F6]">
        <div
          className={`h-full rounded-full transition-all ${
            pct >= targetPct ? "bg-[#03A94D]" : pct >= targetPct - 2 ? "bg-amber-500" : "bg-[#D32D2F]"
          }`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

function SeverityBadge({ severity }) {
  const map = {
    warn: "border-amber-200 bg-amber-50 text-amber-900",
    watch: "border-[#E8EBED] bg-[#F7F8FA] text-[#4E5968]",
    info: "border-[#E8EBED] bg-[#FAFBFC] text-[#4E5968]",
  };
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${map[severity] || map.info}`}
    >
      {severity === "warn" ? "주의" : severity === "watch" ? "관찰" : "안내"}
    </span>
  );
}

function Collapsible({ title, summary, children, defaultOpen = false }) {
  return (
    <details
      className="group mt-4 rounded-xl border border-[#E8EBED] bg-[#FAFBFC] open:bg-white"
      open={defaultOpen || undefined}
    >
      <summary className="cursor-pointer list-none px-4 py-3 text-[13px] font-bold text-[#191F28] marker:content-none">
        <span className="flex items-center justify-between gap-2">
          <span>{title}</span>
          <span className="text-[11px] font-normal text-[#8B95A1] group-open:hidden">
            {summary}
          </span>
          <span className="text-[10px] font-normal text-[#8B95A1]">펼치기</span>
        </span>
      </summary>
      <div className="border-t border-[#E8EBED] px-4 pb-4 pt-3">{children}</div>
    </details>
  );
}

/**
 * @param {{ snapshot?: object | null, loading?: boolean, showHero?: boolean }} props
 */
export default function AdminQualityOpsPanel({
  snapshot,
  loading = false,
  showHero = true,
}) {
  if (loading && !snapshot) {
    return (
      <section className="mt-6 rounded-2xl border border-[#E8EBED] bg-white p-5">
        <p className="text-[14px] text-[#8B95A1]">품질·운영 스냅샷 불러오는 중…</p>
      </section>
    );
  }

  if (!snapshot) {
    return (
      <section className="mt-6 rounded-2xl border border-[#E8EBED] bg-white p-5">
        <p className="text-[14px] text-[#8B95A1]">
          품질·운영 데이터를 불러오지 못했습니다. 관리자 권한을 확인하세요.
        </p>
      </section>
    );
  }

  const { crossChannel, readiness, channelSla, blogProbe, rollout, deliveryTrust, alerts, dataSources, commands } =
    snapshot;

  return (
    <section className="rounded-2xl border border-[#191F28]/10 bg-white p-5 shadow-sm">
      {showHero ? (
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#1B64DA]">
            품질 · 배치 · 오늘 배포
          </p>
          <h2 className="mt-1 text-[18px] font-bold text-[#191F28]">운영 관제</h2>
          <p className="mt-1 text-[12px] text-[#8B95A1]">
            갱신 {formatKst(snapshot.generatedAt)} · 로컬 artifacts·config 기준
          </p>
        </div>
        {readiness?.total != null && (
          <div className="rounded-xl border border-[#E8EBED] px-4 py-2 text-right">
            <p className="text-[11px] text-[#8B95A1]">제품 준비도</p>
            <p className="text-[22px] font-bold text-[#191F28]">{readiness.total}</p>
            <p className="text-[11px] text-[#4E5968]">{readiness.band || "—"}</p>
          </div>
        )}
      </div>
      ) : (
        <p className="text-[12px] text-[#8B95A1]">
          배치·루브릭 상세 · {formatKst(snapshot.generatedAt)}
        </p>
      )}

      {alerts?.length > 0 && (
        <ul className="mt-4 space-y-2">
          {alerts.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-start gap-2 rounded-lg border px-3 py-2 text-[12px]"
            >
              <SeverityBadge severity={a.severity} />
              <span className="flex-1 text-[#4E5968]">{a.message}</span>
              {a.action ? (
                <code className="text-[10px] text-[#8B95A1]">{a.action}</code>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[#E8EBED] p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[14px] font-bold">Cross-channel 배치</h3>
            {crossChannel ? (
              <span className="flex items-center gap-1.5 text-[11px] text-[#8B95A1]">
                <StatusDot status={crossChannel.status} />
                {crossChannel.freshness?.label}
              </span>
            ) : null}
          </div>
          {crossChannel ? (
            <>
              <p className="mt-2 text-[13px] font-semibold text-[#191F28]">
                전체 {crossChannel.pass}/{crossChannel.total} ({crossChannel.passRate}%)
              </p>
              <p className="text-[11px] text-[#8B95A1]">
                시작 {formatKst(crossChannel.startedAt)}
              </p>
              <div className="mt-4 space-y-3">
                <PassBar
                  label="이야기 (blog)"
                  passRate={crossChannel.byChannel?.blog?.passRate}
                  target={crossChannel.byChannel?.blog?.target}
                />
                <PassBar
                  label="플레이스"
                  passRate={crossChannel.byChannel?.place?.passRate}
                  target={crossChannel.byChannel?.place?.target}
                />
                <PassBar
                  label="인스타"
                  passRate={crossChannel.byChannel?.instagram?.passRate}
                  target={crossChannel.byChannel?.instagram?.target}
                />
              </div>
              {crossChannel.blogGapNote ? (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                  {crossChannel.blogGapNote}
                </p>
              ) : null}
            </>
          ) : (
            <p className="mt-2 text-[12px] text-[#8B95A1]">
              artifacts/cross-channel-batch/latest-summary.json 없음
            </p>
          )}
        </div>

        <div className="rounded-xl border border-[#E8EBED] p-4">
          <h3 className="text-[14px] font-bold">준비도 루브릭</h3>
          {readiness ? (
            <>
              <p className="mt-1 text-[11px] text-[#8B95A1]">
                {readiness.freshness?.label} · 기능 {readiness.functionalTotal} + UX{" "}
                {readiness.userTotal}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-semibold text-[#4E5968]">기능</p>
                  <ul className="mt-1 space-y-1">
                    {(readiness.functional || []).map((row) => (
                      <li key={row.id} className="flex justify-between text-[11px] text-[#4E5968]">
                        <span>{row.label}</span>
                        <span>
                          {row.score}/{row.max}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-[#4E5968]">사용자</p>
                  <ul className="mt-1 space-y-1">
                    {(readiness.user || []).map((row) => (
                      <li key={row.id} className="flex justify-between text-[11px] text-[#4E5968]">
                        <span>{row.label}</span>
                        <span>
                          {row.score}/{row.max}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              {(readiness.gaps || []).length > 0 && (
                <ul className="mt-3 space-y-1 border-t border-[#E8EBED] pt-3">
                  {readiness.gaps.map((g) => (
                    <li key={g.id} className="text-[11px] text-[#4E5968]">
                      <strong>{g.label}</strong> {g.pct != null ? `${g.pct}%` : ""}
                      {g.note ? ` — ${g.note}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="mt-2 text-[12px] text-[#8B95A1]">config/product-readiness-score.json 없음</p>
          )}
        </div>
      </div>

      {crossChannel?.failReasons?.length > 0 && (
        <Collapsible
          title="배치 실패 사유"
          summary={`${crossChannel.failReasons.length}종`}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-[11px]">
              <thead>
                <tr className="text-[#8B95A1]">
                  <th className="pb-2 pr-4 font-medium">사유</th>
                  <th className="pb-2 pr-4 font-medium">건수</th>
                  <th className="pb-2 font-medium">힌트</th>
                </tr>
              </thead>
              <tbody>
                {crossChannel.failReasons.slice(0, 8).map((row) => (
                  <tr key={row.reason} className="border-t border-[#F2F4F6] text-[#4E5968]">
                    <td className="py-1.5 pr-4 font-mono text-[10px]">{row.reason}</td>
                    <td className="py-1.5 pr-4">{row.count}</td>
                    <td className="py-1.5 text-[#8B95A1]">{row.hint || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Collapsible>
      )}

      {crossChannel?.failedSamples?.length > 0 && (
        <Collapsible
          title="실패 샘플"
          summary={`${crossChannel.failedSamples.length}건`}
        >
          <p className="text-[11px] text-[#8B95A1]">
            평균 belief {crossChannel.failedBeliefAvg ?? "—"}
          </p>
          <ul className="mt-3 space-y-2">
            {crossChannel.failedSamples.map((s) => (
              <li
                key={s.id}
                className="rounded-lg bg-[#F7F8FA] px-3 py-2 text-[11px] text-[#4E5968]"
              >
                <span className="font-medium text-[#191F28]">{s.label || s.id}</span>
                <span className="ml-2 text-[#8B95A1]">
                  belief {s.belief ?? "—"} · {s.chars ?? "—"}자
                </span>
                <p className="mt-0.5 font-mono text-[10px] text-[#8B95A1]">
                  {(s.failReasons || []).join(", ")}
                </p>
              </li>
            ))}
          </ul>
        </Collapsible>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-[#E8EBED] p-4">
          <h3 className="text-[14px] font-bold">송출 신뢰 등급</h3>
          <p className="mt-1 text-[11px] text-[#8B95A1]">{deliveryTrust?.note}</p>
          <ul className="mt-3 space-y-2">
            {(deliveryTrust?.tiers || []).map((t) => (
              <li key={t.tier} className="rounded-lg bg-[#F7F8FA] px-3 py-2 text-[11px]">
                <span className="font-semibold text-[#191F28]">{t.label}</span>
                <p className="mt-0.5 text-[#4E5968]">{t.hint}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-[#E8EBED] p-4">
          <h3 className="text-[14px] font-bold">채널 SLA</h3>
          {channelSla ? (
            <>
              <p className="mt-1 text-[11px] text-[#8B95A1]">{channelSla.freshness?.label}</p>
              <p className="mt-2 text-[12px] text-[#4E5968]">
                통과 {channelSla.summary?.passed}/{channelSla.summary?.total}
                {channelSla.blogAvgSec != null ? ` · 블로그 ~${channelSla.blogAvgSec}s` : ""}
              </p>
              {(channelSla.overSlaOrError || []).length > 0 ? (
                <p className="mt-2 text-[11px] text-amber-800">
                  SLA 초과: {channelSla.overSlaOrError.join(", ")}
                </p>
              ) : (
                <p className="mt-2 text-[11px] text-[#03A94D]">4채널 SLA 내</p>
              )}
            </>
          ) : (
            <p className="mt-2 text-[12px] text-[#8B95A1]">channel-sla-report 없음</p>
          )}
        </div>

        <div className="rounded-xl border border-[#E8EBED] p-4">
          <h3 className="text-[14px] font-bold">블로그 카테고리 프로브</h3>
          {blogProbe ? (
            <>
              <p className="mt-1 text-[11px] text-[#8B95A1]">{blogProbe.freshness?.label}</p>
              <p className="mt-2 text-[12px] text-[#4E5968]">
                통과율 {blogProbe.passRate ?? "—"}% · 실패 {blogProbe.failed ?? 0}건
              </p>
            </>
          ) : (
            <p className="mt-2 text-[12px] text-[#8B95A1]">
              blog-category-probe-report 없음 (선택 실행)
            </p>
          )}
        </div>
      </div>

      <Collapsible title="오늘 배포 체크리스트" summary={`${(rollout || []).length}항목`}>
        <ul className="grid gap-2 sm:grid-cols-2">
          {(rollout || []).map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-[#E8EBED] bg-[#FAFBFC] px-3 py-2 text-[11px]"
            >
              <p className="font-semibold text-[#191F28]">{item.label}</p>
              <p className="text-[#8B95A1]">{item.module}</p>
              <p className="mt-1 text-[#4E5968]">👁 {item.watch}</p>
            </li>
          ))}
        </ul>
      </Collapsible>

      <Collapsible title="실행 명령" summary={`${(commands || []).length}개`}>
        <div className="flex flex-wrap gap-2">
          {(commands || []).map((cmd) => (
            <code
              key={cmd}
              className="rounded-lg bg-[#F2F4F6] px-2.5 py-1 text-[10px] text-[#4E5968]"
            >
              {cmd}
            </code>
          ))}
        </div>
      </Collapsible>

      {dataSources?.prodNote ? (
        <p className="mt-3 text-[11px] text-[#8B95A1]">{dataSources.prodNote}</p>
      ) : null}
    </section>
  );
}
