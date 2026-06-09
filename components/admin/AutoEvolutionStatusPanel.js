"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/api/clientAuth";
const NIGHTLY_SCHEDULE_KST = "01:30";

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

function phaseLabel(phase) {
  if (phase === "started") return "시작";
  if (phase === "progress") return "진행";
  if (phase === "finished") return "마무리";
  if (phase === "skipped") return "건너뜀";
  if (phase === "error") return "오류";
  return phase || "—";
}

export default function AutoEvolutionStatusPanel() {
  const [qt, setQt] = useState(null);
  const [qtReport, setQtReport] = useState(null);
  const [lab, setLab] = useState(null);
  const [labReport, setLabReport] = useState(null);
  const [activity, setActivity] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const [qtData, labData, actData] = await Promise.all([
        fetchWithAuth("/api/admin/quality-training/status"),
        fetchWithAuth("/api/admin/evolution-lab/status"),
        fetchWithAuth("/api/admin/nightly-evolution/activity?limit=10"),
      ]);
      setQt(qtData);
      if (qtData.report) setQtReport(qtData.report);
      setLab(labData);
      if (labData.report) setLabReport(labData.report);
      if (actData?.ok) setActivity(actData);

      if (qtData.status === "finished" || qtData.status === "idle") {
        const rep = await fetchWithAuth("/api/admin/quality-training/report");
        if (rep.report) setQtReport(rep.report);
      }
      if (!labData.running) {
        const rep = await fetchWithAuth("/api/admin/evolution-lab/report");
        if (rep.report) setLabReport(rep.report);
      }
    } catch {
      /* ignore poll errors */
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 12_000);
    return () => clearInterval(t);
  }, [refresh]);

  const qtRunning = qt?.status === "running" || qt?.running;
  const labRunning = lab?.running;
  const pipelineRunning = activity?.status === "running" || qtRunning || labRunning;

  return (
    <section className="mt-8 rounded-xl border border-[#E8EBED] bg-white p-5">
      <h2 className="text-[16px] font-bold">자동 학습·진화</h2>
      <p className="mt-1 text-[12px] text-[#8B95A1]">
        매일 KST {NIGHTLY_SCHEDULE_KST}에 인사이트 승인·규칙 갱신·소량
        품질 실험이 자동 실행됩니다. 수동 Run은 사용하지 않습니다.
      </p>

      {pipelineRunning && (
        <p className="mt-2 rounded-lg bg-[#E8F3FF] px-3 py-2 text-[12px] font-medium text-[#1B64DA]">
          자동화가 진행 중입니다…
        </p>
      )}

      {activity?.events?.length > 0 && (
        <div className="mt-4 rounded-lg border border-[#E8EBED] bg-[#FAFBFC] p-3">
          <p className="text-[12px] font-semibold text-[#191F28]">최근 자동화 기록</p>
          <ul className="mt-2 space-y-1.5">
            {activity.events.map((ev, i) => (
              <li
                key={`${ev.at}-${ev.step || i}`}
                className="flex flex-wrap items-baseline gap-x-2 text-[11px] text-[#4E5968]"
              >
                <span className="shrink-0 text-[#8B95A1]">{formatKst(ev.at)}</span>
                <span
                  className={
                    ev.phase === "error"
                      ? "text-[#D32D2F]"
                      : ev.phase === "finished"
                        ? "text-[#008A00]"
                        : ev.phase === "progress"
                          ? "text-[#1B64DA]"
                          : "text-[#8B95A1]"
                  }
                >
                  [{phaseLabel(ev.phase)}]
                </span>
                <span>{ev.message}</span>
              </li>
            ))}
          </ul>
          {activity.status === "finished" && activity.finishedAt && (
            <p className="mt-2 text-[11px] text-[#008A00]">
              전체 배치 마무리 · {formatKst(activity.finishedAt)}
            </p>
          )}
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-[#F7F8FA] p-3 text-[12px] text-[#4E5968]">
          <p className="font-semibold text-[#191F28]">품질 자동 테스트</p>
          <p className="mt-1">
            상태:{" "}
            {qtRunning
              ? "실행 중 (야간 배치)"
              : qt?.status === "finished"
                ? "최근 배치 완료"
                : "대기"}
          </p>
          {qt && (
            <p className="mt-1 text-[#8B95A1]">
              진행 {qt.completed ?? qt.progress?.completed ?? 0}/
              {qt.total ?? qt.progress?.total ?? "—"} · 평균{" "}
              {qt.avgScore ?? qt.progress?.avgScore ?? "—"}점
            </p>
          )}
          {qtReport && (
            <p className="mt-2 text-[#8B95A1]">
              최근 리포트 — {qtReport.totalGenerated}건 · 평균 {qtReport.avgScore}
              점 · 통과율 {qtReport.passRate}%
            </p>
          )}
        </div>

        <div className="rounded-lg bg-[#F7F8FA] p-3 text-[12px] text-[#4E5968]">
          <p className="font-semibold text-[#191F28]">Evolution Lab</p>
          <p className="mt-1">
            상태:{" "}
            {labRunning
              ? "실행 중 (야간 배치)"
              : lab?.run?.status === "finished"
                ? "최근 배치 완료"
                : "대기"}
          </p>
          {lab?.run?.progress && (
            <p className="mt-1 text-[#8B95A1]">
              진행 {lab.run.progress.completed ?? 0}/
              {lab.run.progress.total ?? "—"} · 평균{" "}
              {lab.run.progress.avgScore ?? "—"}점
            </p>
          )}
          {labReport && (
            <p className="mt-2 text-[#8B95A1]">
              최근 리포트 — {labReport.totalGenerated ?? labReport.total}건 ·
              통과율 {labReport.passRate ?? "—"}%
            </p>
          )}
        </div>
      </div>

      <p className="mt-3 text-[11px] text-[#8B95A1]">
        피드백·야간 집계 인사이트는 프로덕션에서 자동 규칙 반영됩니다 (
        <code className="text-[10px]">BRICLOG_AUTO_EVOLVE_INSIGHTS</code>
        ).
      </p>
    </section>
  );
}
