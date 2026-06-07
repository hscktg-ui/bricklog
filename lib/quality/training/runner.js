import { randomUUID } from "crypto";
import { generateBlogWithLLMFirst } from "@/lib/llm/contentOrchestrator";
import {
  runPlacePipeline,
  runInstagramPipeline,
  normalizePipelineInput,
} from "@/lib/contentPipeline";
import { generateTrainingInput } from "@/lib/quality/training/inputGenerator";
import { scoreTrainingContent, serializePackForStorage } from "@/lib/quality/training/scorer";
import { applyAutoFix } from "@/lib/quality/training/fixRules";
import { buildTrainingReport } from "@/lib/quality/training/report";
import {
  getActiveRun,
  setActiveRun,
  persistRun,
  loadRunFromDisk,
} from "@/lib/quality/training/state";
import { createPromptContext } from "@/utils/promptBuilder";
import { getQualityTarget } from "@/lib/quality/qualityDefaults";
import { getCoreMaxRewrites } from "@/lib/config/briclogFastPipeline";

const DEFAULTS = {
  maxCount: 300,
  maxHours: 10,
  targetScore: getQualityTarget(),
  maxRewrites: getCoreMaxRewrites(),
  maxApiCalls:
    Number(process.env.BRICLOG_QT_MAX_API_CALLS) || 400,
  maxApiCallsPerHour:
    Number(process.env.BRICLOG_QT_MAX_API_PER_HOUR) || 80,
};

export function createRun(config = {}, startedBy = null) {
  const run = {
    id: randomUUID(),
    status: "running",
    startedBy,
    startedAt: Date.now(),
    config: {
      maxCount: config.maxCount ?? DEFAULTS.maxCount,
      maxHours: config.maxHours ?? DEFAULTS.maxHours,
      targetScore: config.targetScore ?? DEFAULTS.targetScore,
      includeSensitive: config.includeSensitive !== false,
      categories: config.categories || null,
      maxRewrites: config.maxRewrites ?? DEFAULTS.maxRewrites,
    },
    results: [],
    apiCalls: 0,
    errors: 0,
    consecutivePass: 0,
    seenFingerprints: [],
    stopRequested: false,
    stopReason: null,
    report: null,
  };
  run.seen = new Set();
  setActiveRun(run);
  return run;
}

function bumpApi(run, n = 1) {
  run.apiCalls += n;
  const hourAgo = Date.now() - 3600_000;
  run.recentCalls = (run.recentCalls || []).filter((t) => t > hourAgo);
  for (let i = 0; i < n; i++) run.recentCalls.push(Date.now());
}

function shouldStop(run) {
  const cfg = run.config;
  const elapsedH = (Date.now() - run.startedAt) / 3600_000;
  const scores = run.results.map((r) => r.finalScore).filter(Number.isFinite);
  const avg =
    scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;
  const errorRate =
    run.results.length > 0 ? run.errors / run.results.length : 0;

  if (run.stopRequested) return "user_stop";
  if (elapsedH >= cfg.maxHours) return "max_time";
  if (run.results.length >= cfg.maxCount) return "max_count";
  if (run.apiCalls >= DEFAULTS.maxApiCalls) return "api_limit";
  if ((run.recentCalls || []).length >= DEFAULTS.maxApiCallsPerHour)
    return "hourly_limit";
  if (errorRate > 0.1 && run.results.length >= 10) return "error_rate";
  if (avg >= cfg.targetScore && run.results.length >= 20) return "avg_target";
  if (run.consecutivePass >= 20) return "consecutive_pass";
  return null;
}

export async function processOneTrainingItem(run) {
  if (!run || run.status !== "running") return run;

  const gen = generateTrainingInput(
    {
      includeSensitive: run.config.includeSensitive,
      channels: run.config.channels,
    },
    run.seen
  );

  const { input, channel, industry, persona, emotion } = gen;
  const ctx = createPromptContext(input);
  let pack = null;
  let blogPack = null;
  let baseLabel = null;
  let errMsg = null;

  try {
    const form = normalizePipelineInput(input);
    if (channel === "blog") {
      bumpApi(run);
      const result = await generateBlogWithLLMFirst(input);
      pack = result.blogContent;
      baseLabel = result.baseContentLabel;
      if (!pack) errMsg = result.userMessage || "blog_fail";
    } else {
      bumpApi(run);
      const blogRes = await generateBlogWithLLMFirst(input);
      blogPack = blogRes.blogContent;
      baseLabel = blogRes.baseContentLabel;
      if (!blogPack) {
        errMsg = blogRes.userMessage || "blog_fail";
      } else if (channel === "place") {
        pack = runPlacePipeline(form, blogPack, baseLabel);
      } else {
        pack = runInstagramPipeline(form, blogPack, "emotional", baseLabel);
      }
    }
  } catch (err) {
    errMsg = err.message;
    run.errors += 1;
  }

  if (!pack || errMsg) {
    run.errors += 1;
    run.results.push({
      testId: randomUUID(),
      category: industry,
      channel,
      persona,
      emotionTone: emotion,
      firstScore: 0,
      finalScore: 0,
      rewriteCount: 0,
      failReason: errMsg || "empty",
      passOrFail: false,
    });
    run.consecutivePass = 0;
    persistRun(run);
    return run;
  }

  let scored = scoreTrainingContent(pack, { ...ctx, input }, channel);
  const firstScore = scored.total;
  let rewriteCount = 0;

  while (
    scored.total < run.config.targetScore &&
    rewriteCount < run.config.maxRewrites
  ) {
    try {
      const fixed = applyAutoFix(channel, pack, scored.blockers, input);
      pack = fixed.pack;
      rewriteCount += 1;
      bumpApi(run);
      scored = scoreTrainingContent(pack, { ...ctx, input }, channel);
    } catch {
      run.errors += 1;
      break;
    }
  }

  const passOrFail = scored.total >= run.config.targetScore;
  if (passOrFail) run.consecutivePass += 1;
  else run.consecutivePass = 0;

  run.results.push({
    testId: randomUUID(),
    category: industry,
    channel,
    persona,
    emotionTone: emotion,
    inputPrompt: input,
    generatedContent: serializePackForStorage(pack, channel),
    firstScore,
    finalScore: scored.total,
    rewriteCount,
    failReason: passOrFail ? "" : scored.blockers.join(","),
    passOrFail,
  });

  persistRun(run);
  return run;
}

export async function tickTrainingRun() {
  if (tickInFlight) return getActiveRun();
  tickInFlight = true;
  try {
    return await tickTrainingRunInner();
  } finally {
    tickInFlight = false;
  }
}

async function tickTrainingRunInner() {
  let run = getActiveRun();
  if (!run || run.status !== "running") return run;

  if (run.stopRequested) {
    run.status = "finished";
    run.stopReason = "user_stop";
    run.finishedAt = new Date().toISOString();
    run.report = buildTrainingReport(run);
    run.errorRate =
      run.results.length > 0 ? run.errors / run.results.length : 0;
    setActiveRun(run);
    return run;
  }

  const stopBefore = shouldStop(run);
  if (stopBefore) {
    run.status = "finished";
    run.stopReason = stopBefore;
    run.finishedAt = new Date().toISOString();
    run.report = buildTrainingReport(run);
    setActiveRun(run);
    return run;
  }

  await processOneTrainingItem(run);
  run = getActiveRun();

  const stopAfter = shouldStop(run);
  if (stopAfter) {
    run.status = "finished";
    run.stopReason = stopAfter;
    run.finishedAt = new Date().toISOString();
    run.report = buildTrainingReport(run);
    run.errorRate =
      run.results.length > 0 ? run.errors / run.results.length : 0;
    setActiveRun(run);
  }

  return run;
}

export function requestStop() {
  const run = getActiveRun();
  if (run) {
    run.stopRequested = true;
    persistRun(run);
  }
  return run;
}

export function getRunStatus() {
  const run = getActiveRun();
  if (!run) {
    return { status: "idle", report: null };
  }
  const total = run.config?.maxCount ?? DEFAULTS.maxCount;
  const avgScore =
    run.results.length > 0
      ? Math.round(
          (run.results.reduce((a, r) => a + (r.finalScore || 0), 0) /
            run.results.length) *
            10
        ) / 10
      : 0;
  return {
    status: run.status,
    runId: run.id,
    completed: run.results.length,
    total,
    avgScore,
    consecutivePass: run.consecutivePass,
    apiCalls: run.apiCalls,
    stopReason: run.stopReason,
    report: run.report,
    errorRate:
      run.results.length > 0 ? run.errors / run.results.length : 0,
    progress: {
      completed: run.results.length,
      total,
      avgScore,
      consecutivePass: run.consecutivePass,
      errorRate:
        run.results.length > 0 ? run.errors / run.results.length : 0,
      currentLabel: run.results[run.results.length - 1]?.category
        ? `${run.results[run.results.length - 1].category} · ${run.results[run.results.length - 1].channel}`
        : null,
    },
  };
}

let trainingLoopActive = false;
let tickInFlight = false;

async function runTrainingLoop() {
  if (trainingLoopActive) return;
  trainingLoopActive = true;
  while (getActiveRun()?.status === "running") {
    try {
      await tickTrainingRun();
    } catch (err) {
      const run = getActiveRun();
      if (run) {
        run.errors += 1;
        persistRun(run);
      }
      console.error("[quality-training]", err);
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  trainingLoopActive = false;
}

export async function startTrainingRun(userId, config = {}) {
  if (getActiveRun()?.status === "running") {
    return {
      ok: false,
      message: "이미 진행 중인 테스트가 있습니다.",
      runId: getActiveRun().id,
    };
  }

  const { isOpenAIConfigured } = await import("@/lib/llm/llmProvider");
  if (!isOpenAIConfigured()) {
    return {
      ok: false,
      message: "AI 생성 연결이 설정되지 않았습니다. 서버 설정을 확인해 주세요.",
    };
  }

  const run = createRun(
    {
      maxCount: config.maxCount,
      maxHours: config.durationHours ?? config.maxHours,
      targetScore: config.targetScore,
      includeSensitive: config.includeSensitive,
      categories: config.categories,
      channels: config.channels,
    },
    userId
  );

  runTrainingLoop().catch((err) => {
    console.error("[quality-training loop]", err);
  });

  return { ok: true, runId: run.id };
}

export function getActiveRunId() {
  const run = getActiveRun();
  return run?.status === "running" ? run.id : null;
}

export async function stopTrainingRun(runId) {
  const run = getActiveRun();
  if (!run || (runId && run.id !== runId)) {
    return { ok: false, message: "진행 중인 테스트가 없습니다." };
  }
  requestStop();
  return { ok: true, runId: run.id };
}

export async function getTrainingStatus(runId) {
  let run = getActiveRun();
  if (runId && run?.id !== runId) {
    run = loadRunFromDisk(runId);
  }
  if (!run) {
    return { ok: false, message: "실행을 찾을 수 없습니다." };
  }
  const st = run.id === getActiveRun()?.id ? getRunStatus() : null;
  return {
    ok: true,
    status: run.status,
    report: run.report,
    progress: st?.progress || {
      completed: run.results?.length ?? 0,
      total: run.config?.maxCount,
      avgScore: run.results?.length
        ? Math.round(
            (run.results.reduce((a, r) => a + (r.finalScore || 0), 0) /
              run.results.length) *
              10
          ) / 10
        : 0,
    },
  };
}
