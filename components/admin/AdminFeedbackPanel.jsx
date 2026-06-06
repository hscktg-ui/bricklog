"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/api/clientAuth";

function formatKst(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

export default function AdminFeedbackPanel({ onToast }) {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "40" });
      if (filter !== "all") params.set("reaction", filter);
      const data = await fetchWithAuth(`/api/admin/feedback?${params}`);
      if (!data.ok && data.memoryReady === false) {
        onToast?.(data.userMessage, "info");
        setRows([]);
        setSummary(null);
        return;
      }
      setRows(data.rows || []);
      setSummary(data.summary || null);
    } catch (err) {
      onToast?.(err.message || "피드백 목록 로드 실패", "error");
    } finally {
      setLoading(false);
    }
  }, [filter, onToast]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[16px] font-bold text-[#191F28]">사용자 피드백</h2>
          <p className="mt-0.5 text-[11px] text-[#8B95A1]">
            직원·사용자 피드백이 서버에 저장되고 전역 엔진 규칙·브랜드 학습에 자동 반영됩니다.
          </p>
        </div>
        <div className="flex gap-2">
          {["all", "bad", "neutral", "good"].map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`rounded-lg px-3 py-1.5 text-[12px] ${
                filter === id
                  ? "bg-[#191F28] text-white"
                  : "border border-[#E8EBED] bg-white text-[#4E5968]"
              }`}
            >
              {id === "all" ? "전체" : id === "good" ? "좋음" : id === "bad" ? "별로" : "보통"}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-[#E8EBED] px-3 py-1.5 text-[12px]"
          >
            새로고침
          </button>
        </div>
      </div>

      {summary && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-[#E8EBED] bg-white p-3">
            <p className="text-[11px] text-[#8B95A1]">최근 {summary.days}일</p>
            <p className="text-[20px] font-bold">{summary.total}</p>
          </div>
          <div className="rounded-xl border border-[#E8EBED] bg-white p-3">
            <p className="text-[11px] text-[#8B95A1]">좋음 / 별로</p>
            <p className="text-[14px] font-semibold">
              {summary.reactions?.good ?? 0} / {summary.reactions?.bad ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-[#E8EBED] bg-white p-3">
            <p className="text-[11px] text-[#8B95A1]">재작성 포함</p>
            <p className="text-[14px] font-semibold">{summary.withRewrite ?? 0}</p>
          </div>
          <div className="rounded-xl border border-[#E8EBED] bg-white p-3">
            <p className="text-[11px] text-[#8B95A1]">평균 피드백 회차</p>
            <p className="text-[14px] font-semibold">{summary.avgRewriteRound ?? 0}</p>
          </div>
        </div>
      )}

      {summary?.topIntents?.length > 0 && (
        <div className="rounded-xl border border-[#E8EBED] bg-[#FAFBFC] p-3">
          <p className="text-[12px] font-semibold text-[#4E5968]">엔진 학습 의도 TOP</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {summary.topIntents.map((row) => (
              <span
                key={row.id}
                className="rounded-full bg-white px-2.5 py-1 text-[11px] text-[#4E5968] border border-[#E8EBED]"
              >
                {row.label} ({row.count})
              </span>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-[13px] text-[#8B95A1]">불러오는 중…</p>
      ) : rows.length === 0 ? (
        <p className="text-[13px] text-[#8B95A1]">
          피드백 기록이 없거나 schema-v18-feedback-loop.sql 미적용 상태입니다.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#E8EBED] bg-white">
          <table className="min-w-full text-left text-[12px]">
            <thead className="border-b border-[#E8EBED] bg-[#FAFBFC] text-[#8B95A1]">
              <tr>
                <th className="px-3 py-2">시각</th>
                <th className="px-3 py-2">반응</th>
                <th className="px-3 py-2">태그·의도</th>
                <th className="px-3 py-2">메모</th>
                <th className="px-3 py-2">회차</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-[#F2F4F6] align-top">
                  <td className="px-3 py-2 whitespace-nowrap text-[#8B95A1]">
                    {formatKst(row.updatedAt)}
                  </td>
                  <td className="px-3 py-2">{row.reactionLabel}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {(row.tagLabels || []).map((t) => (
                        <span key={t} className="rounded bg-[#FFF8E6] px-1.5 py-0.5 text-[10px]">
                          {t}
                        </span>
                      ))}
                      {(row.intentLabels || []).map((t) => (
                        <span key={t} className="rounded bg-[#E8F9EF] px-1.5 py-0.5 text-[10px]">
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="max-w-[280px] px-3 py-2 text-[#4E5968]">
                    {row.memo || "—"}
                  </td>
                  <td className="px-3 py-2">{row.rewriteRound || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
