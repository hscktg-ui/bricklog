"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/api/clientAuth";
import {
  LAB_RESEARCH_CATEGORIES,
  LAB_SENSITIVE_CATEGORIES,
} from "@/lib/evolution-lab/constants";

export default function EvolutionLabPanel({ onToast }) {
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState(null);
  const [report, setReport] = useState(null);
  const [runId, setRunId] = useState(null);
  const [options, setOptions] = useState({
    maxHours: 4,
    maxCount: 100,
    targetScore: 90,
    includeSensitive: true,
  });

  const loadReport = useCallback(async (id) => {
    try {
      const q = id ? `?runId=${encodeURIComponent(id)}` : "";
      const data = await fetchWithAuth(`/api/admin/evolution-lab/report${q}`);
      if (data.report) setReport(data.report);
    } catch {
      /* ignore */
    }
  }, []);

  const poll = useCallback(async () => {
    try {
      const data = await fetchWithAuth("/api/admin/evolution-lab/status");
      setRunning(data.running);
      if (data.run) {
        setRunId(data.run.runId);
        setStatus(data);
        if (
          data.run.status === "finished" ||
          !data.running
        ) {
          await loadReport(data.run.runId);
        }
      }
    } catch (err) {
      onToast?.(err.message, "error");
    }
  }, [loadReport, onToast]);

  useEffect(() => {
    poll();
    loadReport();
  }, [poll, loadReport]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(poll, 5000);
    return () => clearInterval(t);
  }, [running, poll]);

  const handleStart = async () => {
    try {
      const data = await fetchWithAuth("/api/admin/evolution-lab/start", {
        method: "POST",
        body: JSON.stringify({
          maxCount: options.maxCount,
          durationHours: options.maxHours,
          targetScore: options.targetScore,
          includeSensitive: options.includeSensitive,
        }),
      });
      onToast?.(data.userMessage || "연구를 시작했습니다.", "success");
      setRunning(true);
      setRunId(data.runId);
      setReport(null);
      poll();
    } catch (err) {
      onToast?.(err.message, "error");
    }
  };

  const handleStop = async () => {
    try {
      await fetchWithAuth("/api/admin/evolution-lab/stop", {
        method: "POST",
        body: JSON.stringify({ runId }),
      });
      onToast?.("중지 요청을 보냈습니다.", "info");
      poll();
    } catch (err) {
      onToast?.(err.message, "error");
    }
  };

  const prog = status?.run?.progress;

  return (
    <section className="mt-10 rounded-xl border border-[#191F28]/10 bg-white p-5">
      <h2 className="text-[16px] font-bold">Self Evolution Lab</h2>
      <p className="mt-1 text-[12px] text-[#8B95A1]">
        네이버 블로그 품질 연구 — 동향 분석·AI 냄새 탐지·규칙 자동 보정·생성
        실험(100~500건). 관리자 전용.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-[12px] text-[#4E5968]">
          최대 시간(시간, 최대 4)
          <input
            type="number"
            min={1}
            max={4}
            className="mt-1 w-full rounded-lg border border-[#E8EBED] px-3 py-2 text-[13px]"
            value={options.maxHours}
            onChange={(e) =>
              setOptions((o) => ({
                ...o,
                maxHours: Math.min(4, Number(e.target.value) || 4),
              }))
            }
            disabled={running}
          />
        </label>
        <label className="text-[12px] text-[#4E5968]">
          실험 수(100~500)
          <input
            type="number"
            min={100}
            max={500}
            className="mt-1 w-full rounded-lg border border-[#E8EBED] px-3 py-2 text-[13px]"
            value={options.maxCount}
            onChange={(e) =>
              setOptions((o) => ({
                ...o,
                maxCount: Number(e.target.value) || 100,
              }))
            }
            disabled={running}
          />
        </label>
        <label className="text-[12px] text-[#4E5968]">
          목표 점수
          <input
            type="number"
            min={80}
            max={100}
            className="mt-1 w-full rounded-lg border border-[#E8EBED] px-3 py-2 text-[13px]"
            value={options.targetScore}
            onChange={(e) =>
              setOptions((o) => ({
                ...o,
                targetScore: Number(e.target.value) || 90,
              }))
            }
            disabled={running}
          />
        </label>
        <label className="flex items-center gap-2 pt-6 text-[12px] text-[#4E5968]">
          <input
            type="checkbox"
            checked={options.includeSensitive}
            onChange={(e) =>
              setOptions((o) => ({
                ...o,
                includeSensitive: e.target.checked,
              }))
            }
            disabled={running}
          />
          민감 업종 포함
        </label>
      </div>

      <p className="mt-2 text-[11px] text-[#8B95A1]">
        연구 업종 {LAB_RESEARCH_CATEGORIES.length}종 · 민감{" "}
        {LAB_SENSITIVE_CATEGORIES.length}종 · 규칙은 config/evolution-lab 및
        .data/evolution-lab/rules/에 저장
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleStart}
          disabled={running}
          className="rounded-lg bg-[#191F28] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
        >
          품질 연구 시작
        </button>
        <button
          type="button"
          onClick={handleStop}
          disabled={!running}
          className="rounded-lg border border-[#E8EBED] px-4 py-2 text-[13px] disabled:opacity-50"
        >
          중지
        </button>
      </div>

      {running && prog && (
        <div className="mt-4 rounded-lg bg-[#F7F8FA] p-3 text-[12px]">
          <p>
            {status?.phase === "trend_research"
              ? "동향 분석 중…"
              : `실험 ${prog.completed ?? 0} / ${prog.total ?? "—"}`}{" "}
            · 평균 {prog.avgScore ?? "—"}점 · 연속 통과{" "}
            {prog.consecutivePass ?? 0} · API {prog.apiCalls ?? 0}
          </p>
          {prog.currentLabel && (
            <p className="mt-1 truncate text-[#8B95A1]">{prog.currentLabel}</p>
          )}
        </div>
      )}

      {report && (
        <div className="mt-6 border-t border-[#E8EBED] pt-4 text-[12px]">
          <h3 className="font-bold">연구 리포트</h3>
          <ul className="mt-2 space-y-1 text-[#4E5968]">
            <li>
              {report.totalGenerated}건 · 평균 {report.avgScore}점 (최고{" "}
              {report.maxScore} / 최저 {report.minScore}) · 90점+{" "}
              {report.passRate}%
            </li>
            {report.weakestCategory && (
              <li>가장 약한 업종: {report.weakestCategory}</li>
            )}
            {report.stopReason && <li>종료: {report.stopReason}</li>}
          </ul>
          {report.aiSmellTop10?.length > 0 && (
            <>
              <p className="mt-3 font-semibold">AI 냄새 TOP</p>
              <ul className="list-disc pl-4">
                {report.aiSmellTop10.map((s) => (
                  <li key={s.id}>
                    {s.id} ({s.count})
                  </li>
                ))}
              </ul>
            </>
          )}
          {report.nextSteps?.length > 0 && (
            <>
              <p className="mt-3 font-semibold">다음 과제</p>
              <ul className="list-disc pl-4">
                {report.nextSteps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </>
          )}
          {report.note && (
            <p className="mt-2 text-[11px] text-[#8B95A1]">{report.note}</p>
          )}
        </div>
      )}
    </section>
  );
}
