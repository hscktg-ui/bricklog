"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/api/clientAuth";
import {
  GENERAL_CATEGORIES,
  SENSITIVE_CATEGORIES,
} from "@/lib/quality/training/constants";

export default function QualityTrainingPanel({ onToast }) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(null);
  const [report, setReport] = useState(null);
  const [maxCount, setMaxCount] = useState(50);
  const [targetScore, setTargetScore] = useState(90);
  const [durationHours, setDurationHours] = useState(2);
  const [includeSensitive, setIncludeSensitive] = useState(true);
  const [runId, setRunId] = useState(null);

  const loadReport = useCallback(async (id) => {
    try {
      const q = id ? `?runId=${encodeURIComponent(id)}` : "";
      const data = await fetchWithAuth(
        `/api/admin/quality-training/report${q}`
      );
      if (data.report) setReport(data.report);
    } catch {
      /* ignore */
    }
  }, []);

  const pollStatus = useCallback(async () => {
    try {
      const data = await fetchWithAuth("/api/admin/quality-training/status");
      setRunning(data.running);
      if (data.run) {
        setProgress(data.run.progress);
        setRunId(data.run.runId);
        if (
          data.run.status === "finished" ||
          data.run.status === "completed" ||
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
    pollStatus();
    loadReport();
  }, [pollStatus, loadReport]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(pollStatus, 4000);
    return () => clearInterval(t);
  }, [running, pollStatus]);

  const handleStart = async () => {
    try {
      const data = await fetchWithAuth("/api/admin/quality-training/start", {
        method: "POST",
        body: JSON.stringify({
          maxCount,
          targetScore,
          durationHours,
          includeSensitive,
        }),
      });
      onToast?.(data.userMessage || "시작했습니다.", "success");
      setRunning(true);
      setRunId(data.runId);
      setReport(null);
      pollStatus();
    } catch (err) {
      onToast?.(err.message, "error");
    }
  };

  const handleStop = async () => {
    if (!runId) return;
    try {
      const data = await fetchWithAuth("/api/admin/quality-training/stop", {
        method: "POST",
        body: JSON.stringify({ runId }),
      });
      onToast?.(data.userMessage || "중지 요청했습니다.", "info");
      pollStatus();
    } catch (err) {
      onToast?.(err.message, "error");
    }
  };

  return (
    <section className="mt-10 rounded-xl border border-[#E8EBED] bg-white p-5">
      <h2 className="text-[16px] font-bold">콘텐츠 품질 자동 테스트</h2>
      <p className="mt-1 text-[12px] text-[#8B95A1]">
        다양한 업종·채널로 AI 생성 후 점수를 매기고 자동으로 다듬습니다. 관리자만
        사용할 수 있습니다.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-[12px] text-[#4E5968]">
          최대 생성 횟수
          <input
            type="number"
            min={1}
            max={300}
            value={maxCount}
            onChange={(e) => setMaxCount(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-[#E8EBED] px-3 py-2 text-[14px]"
            disabled={running}
          />
        </label>
        <label className="text-[12px] text-[#4E5968]">
          목표 점수
          <input
            type="number"
            min={70}
            max={100}
            value={targetScore}
            onChange={(e) => setTargetScore(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-[#E8EBED] px-3 py-2 text-[14px]"
            disabled={running}
          />
        </label>
        <label className="text-[12px] text-[#4E5968]">
          최대 실행 시간(시간)
          <input
            type="number"
            min={1}
            max={10}
            value={durationHours}
            onChange={(e) => setDurationHours(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-[#E8EBED] px-3 py-2 text-[14px]"
            disabled={running}
          />
        </label>
        <label className="flex items-end gap-2 text-[12px] text-[#4E5968]">
          <input
            type="checkbox"
            checked={includeSensitive}
            onChange={(e) => setIncludeSensitive(e.target.checked)}
            disabled={running}
          />
          민감 업종 포함 ({SENSITIVE_CATEGORIES.length}종)
        </label>
      </div>

      <p className="mt-2 text-[11px] text-[#8B95A1]">
        일반 업종 {GENERAL_CATEGORIES.length}종 + 선택 시 민감 업종 · 블로그·플레이스·인스타
        채널 랜덤
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleStart}
          disabled={running}
          className="rounded-lg bg-[#03A94D] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
        >
          품질 자동 테스트 시작
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

      {running && progress && (
        <div className="mt-4 rounded-lg bg-[#F7F8FA] p-3 text-[12px]">
          <p>
            진행 {progress.completed ?? 0} / {progress.total ?? "—"} · 평균 점수{" "}
            {progress.avgScore ?? "—"}
          </p>
          {progress.currentLabel && (
            <p className="mt-1 text-[#8B95A1] truncate">{progress.currentLabel}</p>
          )}
        </div>
      )}

      {report && (
        <div className="mt-6 border-t border-[#E8EBED] pt-4">
          <h3 className="text-[14px] font-bold">최근 테스트 결과</h3>
          {runId && (
            <p className="text-[11px] text-[#8B95A1]">실행 ID: {runId.slice(0, 8)}…</p>
          )}
          <ul className="mt-2 space-y-1 text-[12px] text-[#4E5968]">
            <li>
              총 {report.totalGenerated ?? report.total ?? 0}건 · 평균{" "}
              {report.avgScore}점 ·{" "}
              {report.passRate ?? report.pctPass ?? 0}% 목표 달성
            </li>
            {report.weakestCategory && (
              <li>가장 약한 업종: {report.weakestCategory}</li>
            )}
            {report.stopReason && (
              <li>종료 사유: {stopReasonLabel(report.stopReason)}</li>
            )}
          </ul>
          {report.topErrors?.length > 0 && (
            <>
              <p className="mt-3 text-[12px] font-semibold">자주 나온 문제</p>
              <ul className="mt-1 list-disc pl-5 text-[12px] text-[#4E5968]">
                {report.topErrors.slice(0, 5).map((e) => (
                  <li key={e.reason || e.id}>
                    {failureLabel(e.reason || e.id)} ({e.count}회)
                  </li>
                ))}
              </ul>
            </>
          )}
          {report.nextSteps?.length > 0 && (
            <>
              <p className="mt-3 text-[12px] font-semibold">다음 단계</p>
              <ul className="mt-1 list-disc pl-5 text-[12px] text-[#4E5968]">
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

function stopReasonLabel(reason) {
  const map = {
    avg_target: "평균 점수 목표 달성",
    consecutive_pass: "연속 고득점",
    user_stop: "관리자 중지",
    max_generations: "최대 생성 횟수",
    max_wall_time: "시간 제한",
    error_rate: "오류 비율 초과",
    openai_limit: "AI 사용 한도",
    api_limit: "호출 한도",
    completed: "완료",
  };
  return map[reason] || reason;
}

function failureLabel(id) {
  const map = {
    placeholder: "미완성 표현",
    persona_drift: "화자 불일치",
    repetition: "문장 반복",
    ai_cliche: "관용 표현",
    weak_search_intent: "검색 의도 부족",
    weak_brand: "브랜드 반영 부족",
    length: "분량 부족",
  };
  return map[id] || id;
}
