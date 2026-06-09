/**
 * 야간 자동 학습·진화 — 관리자 Run 없이 인사이트 승인 + 소량 품질 실험
 */
import { createServiceSupabase } from "@/lib/supabase/server";
import {
  aggregateGlobalInsightCandidates,
  autoApprovePendingInsights,
} from "@/lib/feedback/globalInsights";
import { refreshEvolutionRulesCache } from "@/lib/evolution-lab/rulesStore";
import { isNightlyAutoEvolutionEnabled } from "@/lib/config/nightlyEvolutionConfig";
import {
  nightlyQualityBatchSize,
  nightlyLabBatchSize,
} from "@/lib/config/nightlyEvolutionConfig";
import { startTrainingRun, tickTrainingRun } from "@/lib/quality/training/runner";
import { getActiveRun, setActiveRun } from "@/lib/quality/training/state";
import { buildTrainingReport } from "@/lib/quality/training/report";
import { startLabRun, tickLabRun } from "@/lib/evolution-lab/labRunner";
import { getActiveLabRun, setActiveLabRun } from "@/lib/evolution-lab/state";
import { buildLabReport } from "@/lib/evolution-lab/labReport";
import {
  beginNightlyEvolutionRun,
  finishNightlyEvolutionRun,
  appendNightlyEvolutionEvent,
} from "@/lib/cron/nightlyEvolutionActivityLog";
import { applyBatchEvolutionFromReport } from "@/lib/evolution/batchEvolutionFromReport";
import fs from "fs";
import path from "path";

function loadLatestCrossChannelBatchSummary() {
  try {
    const file = path.join(
      process.cwd(),
      "artifacts",
      "cross-channel-batch",
      "latest-summary.json"
    );
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

async function finishTrainingRun(run, reason = "cron_batch_complete") {
  if (!run) return null;
  run.status = "finished";
  run.stopReason = reason;
  run.finishedAt = new Date().toISOString();
  run.report = buildTrainingReport(run);
  run.errorRate =
    run.results?.length > 0 ? run.errors / run.results.length : 0;
  setActiveRun(run);
  return run;
}

async function finishLabRun(run, reason = "cron_batch_complete") {
  if (!run) return null;
  run.status = "finished";
  run.stopReason = reason;
  run.finishedAt = new Date().toISOString();
  run.report = buildLabReport(run);
  setActiveLabRun(run);
  return run;
}

/** 단일 크론 요청 안에서 소량 품질 테스트 완료 */
export async function runCronBoundedQualityTraining() {
  if (getActiveRun()?.status === "running") {
    return { ok: true, skipped: true, reason: "training_already_running" };
  }

  const batch = nightlyQualityBatchSize();
  const started = await startTrainingRun("cron", {
    maxCount: batch,
    maxHours: 0.5,
    durationHours: 0.5,
    targetScore: 85,
    includeSensitive: false,
    channels: ["blog"],
  });
  if (!started.ok) {
    return { ok: false, reason: started.message || "training_start_failed" };
  }

  let run = getActiveRun();
  for (let i = 0; i < batch; i += 1) {
    run = await tickTrainingRun();
    if (!run || run.status !== "running") break;
  }
  if (run?.status === "running") {
    run = await finishTrainingRun(run);
  }

  return {
    ok: true,
    runId: run?.id,
    processed: run?.results?.length ?? 0,
    avgScore: run?.report?.avgScore ?? null,
    stopReason: run?.stopReason,
  };
}

/** 단일 크론 요청 안에서 소량 Evolution Lab 완료 */
export async function runCronBoundedEvolutionLab() {
  if (getActiveLabRun()?.status === "running") {
    return { ok: true, skipped: true, reason: "lab_already_running" };
  }

  const batch = nightlyLabBatchSize();
  const started = await startLabRun("cron", {
    maxCount: batch,
    maxHours: 0.5,
    durationHours: 0.5,
    targetScore: 85,
    includeSensitive: false,
  });
  if (!started.ok) {
    return { ok: false, reason: started.message || "lab_start_failed" };
  }

  let run = getActiveLabRun();
  for (let i = 0; i < batch; i += 1) {
    run = await tickLabRun();
    if (!run || run.status !== "running") break;
  }
  if (run?.status === "running") {
    run = await finishLabRun(run);
  }

  return {
    ok: true,
    runId: run?.id,
    processed: run?.results?.length ?? 0,
    passRate: run?.report?.passRate ?? null,
    stopReason: run?.stopReason,
  };
}

/**
 * @param {{ skipTraining?: boolean, skipLab?: boolean }} [options]
 */
export async function runNightlyEvolutionPipeline(options = {}) {
  if (!isNightlyAutoEvolutionEnabled()) {
    appendNightlyEvolutionEvent("skipped", "야간 자동화가 꺼져 있어 건너뛰었습니다.", {
      reason: "nightly_auto_off",
    });
    return { ok: true, skipped: true, reason: "nightly_auto_off" };
  }

  const runId = beginNightlyEvolutionRun();
  const db = createServiceSupabase();
  const ranAt = new Date().toISOString();

  appendNightlyEvolutionEvent("progress", "전역 인사이트 후보를 집계하는 중입니다.", {
    step: "insights_aggregate",
  });
  const insights = await aggregateGlobalInsightCandidates();
  appendNightlyEvolutionEvent("finished", "인사이트 후보 집계를 마무리했습니다.", {
    step: "insights_aggregate",
    suggested: insights.suggestions ?? 0,
    inserted: insights.inserted ?? 0,
  });

  appendNightlyEvolutionEvent("progress", "대기 중인 인사이트를 자동 승인하는 중입니다.", {
    step: "insights_approve",
  });
  const approved = db
    ? await autoApprovePendingInsights(db)
    : { ok: false, reason: "no_service_role" };
  appendNightlyEvolutionEvent(
    approved.ok !== false ? "finished" : "error",
    approved.ok !== false
      ? "인사이트 자동 승인을 마무리했습니다."
      : "인사이트 자동 승인을 진행하지 못했습니다.",
    { step: "insights_approve", approved: approved.approved ?? 0 }
  );

  appendNightlyEvolutionEvent("progress", "진화 규칙 캐시를 갱신하는 중입니다.", {
    step: "rules_refresh",
  });
  await refreshEvolutionRulesCache(db);
  appendNightlyEvolutionEvent("finished", "진화 규칙 갱신을 마무리했습니다.", {
    step: "rules_refresh",
  });

  let quality = { ok: true, skipped: true, reason: "skipped" };
  let lab = { ok: true, skipped: true, reason: "skipped" };

  if (!options.skipTraining) {
    appendNightlyEvolutionEvent("progress", "품질 자동 테스트를 진행하는 중입니다.", {
      step: "quality_training",
    });
    try {
      quality = await runCronBoundedQualityTraining();
      if (quality.skipped) {
        appendNightlyEvolutionEvent("skipped", "품질 테스트가 이미 실행 중이라 건너뛰었습니다.", {
          step: "quality_training",
          reason: quality.reason,
        });
      } else if (quality.ok) {
        appendNightlyEvolutionEvent("finished", "품질 자동 테스트를 마무리했습니다.", {
          step: "quality_training",
          processed: quality.processed ?? 0,
          avgScore: quality.avgScore,
        });
      } else {
        appendNightlyEvolutionEvent("error", "품질 자동 테스트를 마무리하지 못했습니다.", {
          step: "quality_training",
          reason: quality.reason,
        });
      }
    } catch (err) {
      quality = { ok: false, reason: err.message || "training_failed" };
      appendNightlyEvolutionEvent("error", "품질 자동 테스트 중 오류가 발생했습니다.", {
        step: "quality_training",
        reason: quality.reason,
      });
    }
  }

  if (!options.skipLab) {
    appendNightlyEvolutionEvent("progress", "Evolution Lab 실험을 진행하는 중입니다.", {
      step: "evolution_lab",
    });
    try {
      lab = await runCronBoundedEvolutionLab();
      if (lab.skipped) {
        appendNightlyEvolutionEvent("skipped", "Evolution Lab이 이미 실행 중이라 건너뛰었습니다.", {
          step: "evolution_lab",
          reason: lab.reason,
        });
      } else if (lab.ok) {
        appendNightlyEvolutionEvent("finished", "Evolution Lab 실험을 마무리했습니다.", {
          step: "evolution_lab",
          processed: lab.processed ?? 0,
          passRate: lab.passRate,
        });
      } else {
        appendNightlyEvolutionEvent("error", "Evolution Lab 실험을 마무리하지 못했습니다.", {
          step: "evolution_lab",
          reason: lab.reason,
        });
      }
    } catch (err) {
      lab = { ok: false, reason: err.message || "lab_failed" };
      appendNightlyEvolutionEvent("error", "Evolution Lab 실험 중 오류가 발생했습니다.", {
        step: "evolution_lab",
        reason: lab.reason,
      });
    }
  }

  const result = {
    ok: true,
    runId,
    ranAt,
    insights,
    approved,
    quality,
    lab,
  };

  const batchSummary = loadLatestCrossChannelBatchSummary();
  let batchEvolution = { ok: true, skipped: true, reason: "no_batch_report" };
  if (batchSummary?.failReasons && Object.keys(batchSummary.failReasons).length) {
    appendNightlyEvolutionEvent("progress", "배치 테스트 결과로 규칙을 진화하는 중입니다.", {
      step: "batch_evolution",
    });
    batchEvolution = applyBatchEvolutionFromReport(batchSummary);
    appendNightlyEvolutionEvent("finished", "배치 기반 규칙 진화를 마무리했습니다.", {
      step: "batch_evolution",
      applied: batchEvolution.applied === true,
    });
  }
  result.batchEvolution = batchEvolution;

  finishNightlyEvolutionRun(result);
  return result;
}
