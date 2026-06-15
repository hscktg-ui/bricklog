"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/api/clientAuth";
import { StatCard } from "@/components/admin/AdminCharts";
import { UTM_CAMPAIGN_PRESETS } from "@/lib/seo/utmCampaignLinks";

function ChannelBars({ channels = [] }) {
  if (!channels.length) {
    return <p className="text-[12px] text-[#8B95A1]">집계된 유입 채널이 없습니다.</p>;
  }
  const max = Math.max(...channels.map((c) => c.count), 1);
  return (
    <ul className="space-y-2">
      {channels.map((c) => (
        <li key={c.id}>
          <div className="flex items-center justify-between gap-2 text-[12px]">
            <span className="font-medium text-[#191F28]">{c.label}</span>
            <span className="text-[#4E5968]">
              {c.count} · {c.share}%
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#F2F4F6]">
            <div
              className="h-full rounded-full bg-[#03A94D]"
              style={{ width: `${Math.max(4, (c.count / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function TopList({ title, items = [] }) {
  return (
    <div>
      <h4 className="text-[13px] font-bold text-[#191F28]">{title}</h4>
      {items.length === 0 ? (
        <p className="mt-2 text-[12px] text-[#8B95A1]">데이터 없음</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {items.map((item) => (
            <li
              key={item.label}
              className="flex items-start justify-between gap-2 text-[11px] text-[#4E5968]"
            >
              <span className="break-all">{item.label}</span>
              <span className="shrink-0 font-semibold text-[#191F28]">{item.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AdminTrafficPanel({ onToast }) {
  const [traffic, setTraffic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await fetchWithAuth("/api/admin/traffic");
      setTraffic(data.traffic || null);
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

  if (loading && !traffic) {
    return (
      <section className="rounded-xl border border-[#E8EBED] bg-white p-4">
        <p className="text-[13px] text-[#8B95A1]">유입 경로를 불러오는 중…</p>
      </section>
    );
  }

  const week = traffic?.last7d;
  const month = traffic?.last30d;

  return (
    <section className="rounded-xl border border-[#03A94D]/25 bg-gradient-to-br from-[#03C75A]/6 to-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[16px] font-bold text-[#191F28]">유입 경로 · 검색 유입</h3>
          <p className="mt-1 text-[12px] text-[#4E5968]">
            referrer·UTM 기준 집계 — Google/Naver organic은 referrer 패턴으로 추정합니다.
            방문 수는 페이지뷰·세션 기준이며, 회원 가입 수와 직접 비교하지 마세요.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={refreshing}
          className="rounded-lg border border-[#E8EBED] bg-white px-3 py-1.5 text-[12px] disabled:opacity-50"
        >
          {refreshing ? "갱신 중…" : "새로고침"}
        </button>
      </div>

      {!traffic?.tableReady ? (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
          site_visits 테이블이 없어 유입 집계를 할 수 없습니다. schema-v17을 적용하세요.
        </p>
      ) : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="7일 방문"
              value={week?.total ?? "—"}
              hint={`순방문 ${week?.uniqueSessions ?? "—"}`}
              small
            />
            <StatCard
              label="7일 검색 유입"
              value={week?.organic ?? "—"}
              hint={`전체의 ${week?.organicRate ?? 0}%`}
              small
            />
            <StatCard
              label="30일 방문"
              value={month?.total ?? "—"}
              hint={`순방문 ${month?.uniqueSessions ?? "—"}`}
              small
            />
            <StatCard
              label="30일 검색 유입"
              value={month?.organic ?? "—"}
              hint={`전체의 ${month?.organicRate ?? 0}%`}
              small
            />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-[#E8EBED] bg-white p-4">
              <h4 className="text-[14px] font-bold">최근 7일 채널</h4>
              <div className="mt-3">
                <ChannelBars channels={week?.channels} />
              </div>
            </div>
            <div className="rounded-xl border border-[#E8EBED] bg-white p-4">
              <h4 className="text-[14px] font-bold">최근 30일 채널</h4>
              <div className="mt-3">
                <ChannelBars channels={month?.channels} />
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-[#E8EBED] bg-white p-4">
              <TopList title="인기 경로 (7일)" items={week?.topPaths} />
            </div>
            <div className="rounded-xl border border-[#E8EBED] bg-white p-4">
              <TopList title="referrer (7일)" items={week?.topReferrers} />
            </div>
            <div className="rounded-xl border border-[#E8EBED] bg-white p-4">
              <TopList title="UTM 캠페인 (7일)" items={week?.topCampaigns} />
            </div>
          </div>
        </>
      )}

      {traffic?.hints?.length > 0 && (
        <ul className="mt-4 space-y-1 text-[11px] text-[#8B95A1]">
          {traffic.hints.map((hint) => (
            <li key={hint}>· {hint}</li>
          ))}
        </ul>
      )}

      <div className="mt-3 rounded-xl border border-[#E8EBED] bg-white p-4">
        <p className="text-[12px] font-bold text-[#191F28]">공지용 UTM 링크 (복사)</p>
        <ul className="mt-2 space-y-2">
          {UTM_CAMPAIGN_PRESETS.map((preset) => (
            <li key={preset.id} className="text-[11px] text-[#4E5968]">
              <span className="font-semibold text-[#191F28]">{preset.label}</span>
              <code className="mt-0.5 block break-all rounded bg-[#F2F4F6] px-2 py-1">
                {preset.url}
              </code>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
