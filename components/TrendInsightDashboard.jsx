"use client";

import { useEffect, useState } from "react";
import { fetchTodaySnapshot } from "@/lib/trends/clientSnapshot";
import { kstDateString } from "@/lib/trends/collectors/base";

export default function TrendInsightDashboard({
  industryKey = "flower",
  compact = false,
}) {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const s = await fetchTodaySnapshot();
      if (!cancelled) {
        setSnapshot(s);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const industry =
    snapshot?.industries?.find((i) => i.industryKey === industryKey) ||
    snapshot?.industries?.[0];

  if (loading) {
    return (
      <div className="rounded-xl border border-[#E8EBED] bg-white p-4 text-[12px] text-[#8B95A1]">
        트렌드 스냅샷 불러오는 중…
      </div>
    );
  }

  if (!snapshot?.hasVerifiedData) {
    return (
      <div className="rounded-xl border border-dashed border-[#E8EBED] bg-[#FAFBFC] p-4">
        <p className="text-[12px] font-semibold text-[#4E5968]">
          실시간 트렌드 (수집 대기)
        </p>
        <p className="mt-1 text-[11px] text-[#8B95A1]">
          검증된 수집 데이터가 없습니다. 관리자가 API 연동 후 매일 06:00 KST
          수집을 실행합니다. 가짜 트렌드는 표시하지 않습니다.
        </p>
        <p className="mt-2 text-[10px] text-[#B0B8C1]">
          로컬: <code className="text-[#03A94D]">npm run trends:collect</code>
        </p>
      </div>
    );
  }

  const dateLabel = snapshot.dateKst || kstDateString();

  if (compact) {
    return (
      <div className="rounded-xl border border-[#E8EBED] bg-gradient-to-br from-white to-[#E8F9EF]/40 p-3">
        <p className="text-[11px] font-bold text-[#03A94D]">
          {dateLabel} 콘텐츠 인사이트
        </p>
        {industry && (
          <ul className="mt-2 space-y-0.5 text-[11px] text-[#4E5968]">
            {industry.risingThemes?.slice(0, 3).map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#E8EBED] bg-white p-5 shadow-sm">
      <p className="text-[13px] font-bold text-[#191F28]">
        {dateLabel} 콘텐츠 인사이트
      </p>
      <p className="mt-0.5 text-[11px] text-[#8B95A1]">
        실제 수집 {snapshot.signals.length}건 · 원문 미제공 · 패턴만 요약
      </p>

      {industry ? (
        <div className="mt-4">
          <p className="text-[14px] font-semibold text-[#191F28]">
            {industry.label}
          </p>
          <ul className="mt-2 space-y-1 text-[13px] text-[#4E5968]">
            {industry.risingThemes?.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          {industry.scores?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {industry.scores.map((s) => (
                <span
                  key={s.theme}
                  className="rounded-full bg-[#F7F8FA] px-2.5 py-1 text-[11px] text-[#4E5968]"
                >
                  {s.theme} {s.score}점
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="mt-3 text-[12px] text-[#8B95A1]">
          오늘 수집 데이터에 해당 업종 신호가 없습니다.
        </p>
      )}

      <details className="mt-4">
        <summary className="cursor-pointer text-[11px] text-[#8B95A1]">
          수집 상태
        </summary>
        <ul className="mt-2 space-y-1 text-[10px] text-[#8B95A1]">
          {Object.entries(snapshot.collectorStatus || {}).map(([k, v]) => (
            <li key={k}>
              {k}: {v.ok ? `${v.count}건` : v.pending ? "API 대기" : v.error}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
