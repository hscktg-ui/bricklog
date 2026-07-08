"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/api/clientAuth";
import { StatCard } from "@/components/admin/AdminCharts";
import { ADMIN_GHOST_BTN, ADMIN_PANEL } from "@/lib/admin/adminVision2030Styles";

function formatKst(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

const AUDIENCE_BADGE = {
  admin_operator: "bg-[#3182F6]/12 text-[#1B64DA]",
  team_internal: "bg-[#8B5CF6]/12 text-[#6D28D9]",
  e2e_test: "bg-[#F59E0B]/12 text-[#B45309]",
  automated_test: "bg-[#94A3B8]/15 text-[#475569]",
  external: "bg-[#03C75A]/12 text-[#03A94D]",
};

function AudienceBadge({ audience, label }) {
  const cls = AUDIENCE_BADGE[audience] || AUDIENCE_BADGE.external;
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}>
      {label}
    </span>
  );
}

function TrafficPeriodCard({ title, data, audited }) {
  if (!data) return null;
  return (
    <div className="rounded-xl border border-[#E8EBED] bg-white p-4">
      <p className="text-[12px] font-bold text-[#191F28]">{title}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div>
          <p className="text-[11px] text-[#8B95A1]">순방문 (session)</p>
          <p className="text-[20px] font-bold text-[#191F28]">
            {audited ?? data.uniqueSessions ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-[#8B95A1]">페이지뷰</p>
          <p className="text-[20px] font-bold text-[#191F28]">{data.pageviews ?? "—"}</p>
        </div>
      </div>
      {data.topChannels?.length > 0 ? (
        <p className="mt-2 text-[10px] text-[#8B95A1]">
          상위: {data.topChannels.map((c) => `${c.label} ${c.count}`).join(" · ")}
        </p>
      ) : null}
    </div>
  );
}

/**
 * 회원·순방문·최근 생성 — Admin 운영 SSOT 패널
 */
export default function AdminAudiencePanel({ onToast }) {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [memberFilter, setMemberFilter] = useState("all");

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await fetchWithAuth("/api/admin/audience");
      setSnapshot(data.snapshot || null);
    } catch (err) {
      onToast?.(err.message, "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onToast]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !snapshot) {
    return (
      <section className={`${ADMIN_PANEL} mb-6 p-4`}>
        <p className="text-[13px] text-[#8B95A1]">회원·유입·생성 현황 불러오는 중…</p>
      </section>
    );
  }

  if (!snapshot) return null;

  const members = snapshot.members?.rows || [];
  const filtered =
    memberFilter === "external"
      ? members.filter((m) => m.isExternal)
      : memberFilter === "internal"
        ? members.filter((m) => !m.isExternal)
        : members;

  const t7 = snapshot.traffic?.last7d;
  const t21 = snapshot.traffic?.last21d;

  return (
    <section className={`${ADMIN_PANEL} mb-6 space-y-5 p-4`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-[16px] font-bold text-[#191F28]">회원 · 유입 · 생성</h2>
          <p className="mt-0.5 text-[11px] text-[#8B95A1]">
            전체 회원 {snapshot.members?.total ?? "—"}명 · 외부{" "}
            <strong className="text-[#03A94D]">{snapshot.members?.external ?? 0}</strong>명 ·
            팀·테스트 {snapshot.members?.internal ?? 0}명 · {formatKst(snapshot.asOf)} 갱신
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={refreshing}
          className={`${ADMIN_GHOST_BTN} disabled:opacity-50`}
        >
          {refreshing ? "갱신 중…" : "새로고침"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="전체 회원"
          value={snapshot.members?.total ?? "—"}
          hint={`외부 ${snapshot.members?.external ?? 0} · 내부 ${snapshot.members?.internal ?? 0}`}
        />
        <StatCard
          label="21일 순방문"
          value={t21?.uniqueSessionsAudited ?? "—"}
          hint={`PV ${t21?.pageviews ?? "—"} · /admin·intent 제외`}
        />
        <StatCard
          label="7일 순방문"
          value={t7?.uniqueSessionsAudited ?? "—"}
          hint={`PV ${t7?.pageviews ?? "—"}`}
        />
        <StatCard
          label="외부 가입자"
          value={snapshot.members?.external ?? "—"}
          hint="팀·테스트 이메일 제외"
        />
      </div>

      {snapshot.hints?.length > 0 && (
        <ul className="rounded-lg bg-[#F7F8FA] px-3 py-2 text-[11px] text-[#4E5968]">
          {snapshot.hints.map((h) => (
            <li key={h}>· {h}</li>
          ))}
        </ul>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <TrafficPeriodCard
          title="최근 7일 유입"
          data={t7}
          audited={t7?.uniqueSessionsAudited}
        />
        <TrafficPeriodCard
          title="최근 21일 유입"
          data={t21}
          audited={t21?.uniqueSessionsAudited}
        />
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[14px] font-bold text-[#191F28]">회원 목록</h3>
          <div className="flex gap-1">
            {[
              { id: "all", label: "전체" },
              { id: "external", label: "외부만" },
              { id: "internal", label: "팀·테스트" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setMemberFilter(f.id)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                  memberFilter === f.id
                    ? "bg-[#191F28] text-white"
                    : "bg-[#F2F4F6] text-[#4E5968]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-[#E8EBED]">
          <table className="min-w-full text-left text-[11px]">
            <thead className="bg-[#F7F8FA] text-[#4E5968]">
              <tr>
                <th className="px-3 py-2 font-semibold">구분</th>
                <th className="px-3 py-2 font-semibold">이메일</th>
                <th className="px-3 py-2 font-semibold">닉네임</th>
                <th className="px-3 py-2 font-semibold">가입</th>
                <th className="px-3 py-2 font-semibold">최근 접속</th>
                <th className="px-3 py-2 font-semibold">브랜드</th>
                <th className="px-3 py-2 font-semibold">글·생성</th>
                <th className="px-3 py-2 font-semibold">유입</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="border-t border-[#F2F4F6]">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <AudienceBadge audience={m.audience} label={m.audienceLabel} />
                  </td>
                  <td className="px-3 py-2 font-medium text-[#191F28]">{m.email}</td>
                  <td className="px-3 py-2 text-[#4E5968]">{m.nickname || "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-[#8B95A1]">
                    {formatKst(m.createdAt)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-[#8B95A1]">
                    {formatKst(m.lastSeenAt || m.lastLoginAt)}
                  </td>
                  <td className="px-3 py-2 text-[#4E5968]">
                    {m.brandCount > 0
                      ? `${m.brandCount} (${(m.brands || []).map((b) => b.name).join(", ")})`
                      : "0"}
                  </td>
                  <td className="px-3 py-2 text-[#4E5968]">
                    저장 {m.contentCount} · gen {m.generationCount}
                    {!m.profileCompleted ? (
                      <span className="ml-1 text-amber-700">· 프로필 미완료</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-[#8B95A1]">
                    {m.acquisition?.channel || "—"}
                    {m.acquisition?.path ? ` · ${m.acquisition.path}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-[14px] font-bold text-[#191F28]">최근 생성·활동</h3>
        <p className="mt-0.5 text-[11px] text-[#8B95A1]">
          content_items · generations · usage_logs (blog_generate 등)
        </p>
        {(snapshot.recentActivity || []).length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-[#E8EBED] px-3 py-6 text-center text-[12px] text-[#8B95A1]">
            저장된 글·생성 기록이 없습니다.
          </p>
        ) : (
          <ul className="mt-3 max-h-[360px] space-y-2 overflow-y-auto">
            {(snapshot.recentActivity || []).map((row) => (
              <li
                key={`${row.kind}-${row.id}`}
                className="rounded-lg border border-[#F2F4F6] px-3 py-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-[#F2F4F6] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[#4E5968]">
                    {row.kind}
                  </span>
                  <span className="text-[10px] text-[#8B95A1]">{row.channel}</span>
                  <AudienceBadge
                    audience={row.audience}
                    label={row.audience === "external" ? "외부" : "내부"}
                  />
                  <span className="ml-auto text-[10px] text-[#8B95A1]">{formatKst(row.at)}</span>
                </div>
                <p className="mt-1 font-medium text-[#191F28]">{row.title || "(제목 없음)"}</p>
                <p className="text-[11px] text-[#4E5968]">{row.userEmail || "익명"}</p>
                {row.excerpt ? (
                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[#8B95A1]">
                    {row.excerpt}
                  </p>
                ) : null}
                {row.qualityScore != null ? (
                  <p className="mt-1 text-[10px] text-[#3182F6]">품질 {row.qualityScore}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
