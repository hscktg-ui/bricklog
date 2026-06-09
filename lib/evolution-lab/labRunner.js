import { randomUUID } from "crypto";
import { generateBlogWithLLMFirst } from "@/lib/llm/contentOrchestrator";
import { createPromptContext } from "@/utils/promptBuilder";
import { applyAutoFix } from "@/lib/quality/training/fixRules";
import { serializePackForStorage } from "@/lib/quality/training/scorer";
import { resolveSensitiveCompliance } from "@/lib/compliance/sensitiveCategories";
import { runSensitiveComplianceScan } from "@/lib/compliance/sensitiveFactCheck";
import { getBlogFullText } from "@/utils/qualityCheck";
import { generateLabInput } from "@/lib/evolution-lab/inputGenerator";
import { analyzeCategoryTrends } from "@/lib/evolution-lab/trendResearch";
import { scoreEvolutionBlog } from "@/lib/evolution-lab/labScorer";
import {
  detectAiSmells,
  mergeSmellStats,
} from "@/lib/evolution-lab/aiSmellTracker";
import { evolveRulesFromRun } from "@/lib/evolution-lab/ruleMutator";
import { buildLabReport } from "@/lib/evolution-lab/labReport";
import { getEvolutionPromptAddon } from "@/lib/evolution-lab/rulesStore";
import {
  getActiveLabRun,
  setActiveLabRun,
  persistLabRun,
} from "@/lib/evolution-lab/state";
import {
  LAB_MAX_HOURS_DEFAULT,
  LAB_MIN_EXPERIMENTS,
  LAB_MAX_EXPERIMENTS,
  LAB_TARGET_SCORE,
  LAB_CONSECUTIVE_PASS,
  LAB_MAX_REWRITES,
  LAB_ERROR_RATE_MAX,
  LAB_SAME_ERROR_STOP,
  LAB_MAX_API_CALLS,
  LAB_MAX_API_PER_HOUR,
} from "@/lib/evolution-lab/constants";

let tickInFlight = false;
let trainingLoopActive = false;

function bumpApi(run, n = 1) {
  run.apiCalls += n;
  const hourAgo = Date.now() - 3600_000;
  run.recentCalls = (run.recentCalls || []).filter((t) => t > hourAgo);
  for (let i = 0; i < n; i++) run.recentCalls.push(Date.now());
}

function trackError(run, key) {
  if (!key) return;
  run.errorCounts[key] = (run.errorCounts[key] || 0) + 1;
  if (run.errorCounts[key] >= LAB_SAME_ERROR_STOP) {
    run.stopReason = "same_error_loop";
    run.stopRequested = true;
  }
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
  if (run.apiCalls >= LAB_MAX_API_CALLS) return "api_limit";
  if ((run.recentCalls || []).length >= LAB_MAX_API_PER_HOUR)
    return "hourly_limit";
  if (errorRate > LAB_ERROR_RATE_MAX && run.results.length >= 10)
    return "error_rate";
  if (avg >= cfg.targetScore && run.results.length >= 20) return "avg_target";
  if (run.consecutivePass >= LAB_CONSECUTIVE_PASS) return "consecutive_pass";
  if (run.stopReason === "same_error_loop") return "same_error_loop";
  return null;
}

async function runSensitiveChecks(pack, input, compliance) {
  if (!compliance?.isSensitive) return { pass: true, violations: [] };
  const text = getBlogFullText(pack);
  const scan1 = runSensitiveComplianceScan(text, compliance);
  const scan2 = runSensitiveComplianceScan(text, compliance);
  return {
    pass: scan1.pass && scan2.pass,
    violations: [...scan1.violations, ...scan2.violations],
  };
}

export async function processOneLabItem(run) {
  if (!run || run.status !== "running") return run;

  const gen = generateLabInput(
    {
      includeSensitive: run.config.includeSensitive,
      categories: run.config.categories,
    },
    run.seen
  );

  const { input, industry, persona, emotion } = gen;
  input.evolutionLabBrief = getEvolutionPromptAddon(input);
  const ctx = createPromptContext(input);
  const compliance = resolveSensitiveCompliance(input);
  const trendCtx = { category: industry };

  let pack = null;
  let errMsg = null;

  try {
    bumpApi(run);
    const result = await generateBlogWithLLMFirst(input);
    pack = result.blogContent;
    if (!pack) errMsg = result.userMessage || "blog_fail";
  } catch (err) {
    errMsg = err.message;
    run.errors += 1;
    trackError(run, "api_error");
  }

  if (!pack || errMsg) {
    run.errors += 1;
    trackError(run, errMsg || "empty");
    run.results.push({
      testId: randomUUID(),
      category: industry,
      persona,
      emotionTone: emotion,
      firstScore: 0,
      finalScore: 0,
      rewriteCount: 0,
      failReason: errMsg || "empty",
      passOrFail: false,
    });
    run.consecutivePass = 0;
    persistLabRun(run);
    return run;
  }

  let sensitive = await runSensitiveChecks(pack, input, compliance);
  if (!sensitive.pass) {
    try {
      const fixed = applyAutoFix("blog", pack, ["sensitive_violation"], input);
      pack = fixed.pack;
      bumpApi(run);
      sensitive = await runSensitiveChecks(pack, input, compliance);
    } catch {
      /* keep */
    }
  }

  let scored = scoreEvolutionBlog(pack, { ...ctx, input }, trendCtx);
  const firstScore = scored.total;
  let rewriteCount = 0;
  run.smellStats = mergeSmellStats(run.smellStats, scored.smells);

  while (
    scored.total < run.config.targetScore &&
    rewriteCount < LAB_MAX_REWRITES
  ) {
    try {
      const fixed = applyAutoFix("blog", pack, scored.blockers, input);
      pack = fixed.pack;
      rewriteCount += 1;
      bumpApi(run);
      sensitive = await runSensitiveChecks(pack, input, compliance);
      if (!sensitive.pass) {
        scored = scoreEvolutionBlog(pack, { ...ctx, input }, trendCtx);
        break;
      }
      scored = scoreEvolutionBlog(pack, { ...ctx, input }, trendCtx);
      run.smellStats = mergeSmellStats(run.smellStats, scored.smells);
    } catch (err) {
      run.errors += 1;
      trackError(run, "rewrite_fail");
      break;
    }
  }

  const passOrFail =
    scored.total >= run.config.targetScore && sensitive.pass;
  if (passOrFail) run.consecutivePass += 1;
  else {
    run.consecutivePass = 0;
    const failKey = scored.blockers[0] || "low_score";
    trackError(run, failKey);
  }

  run.results.push({
    testId: randomUUID(),
    category: industry,
    persona,
    emotionTone: emotion,
    title: pack.title || pack.representativeTitle,
    firstScore,
    finalScore: scored.total,
    rewriteCount,
    blockers: scored.blockers,
    smells: scored.smells,
    dimensions: scored.dimensions,
    failReason: passOrFail ? "" : scored.blockers.join(","),
    passOrFail,
    sensitivePass: sensitive.pass,
  });

  if (run.results.length % 15 === 0) {
    const evo = evolveRulesFromRun(run);
    run.ruleEvolutions = [...(run.ruleEvolutions || []), evo];
    run.lastRuleEvolution = evo;
  }

  persistLabRun(run);
  return run;
}

export async function tickLabRun() {
  if (tickInFlight) return getActiveLabRun();
  tickInFlight = true;
  try {
    let run = getActiveLabRun();
    if (!run || run.status !== "running") return run;

    if (!run.trendResearch) {
      run.trendResearch = analyzeCategoryTrends({
        includeSensitive: run.config.includeSensitive,
        categories: run.config.categories,
      });
      persistLabRun(run);
    }

    if (run.stopRequested) {
      run.status = "finished";
      run.stopReason = "user_stop";
      run.finishedAt = new Date().toISOString();
      run.report = buildLabReport(run);
      setActiveLabRun(run);
      return run;
    }

    const stopBefore = shouldStop(run);
    if (stopBefore) {
      run.status = "finished";
      run.stopReason = stopBefore;
      run.finishedAt = new Date().toISOString();
      run.report = buildLabReport(run);
      setActiveLabRun(run);
      return run;
    }

    await processOneLabItem(run);
    run = getActiveLabRun();

    const stopAfter = shouldStop(run);
    if (stopAfter) {
      run.status = "finished";
      run.stopReason = stopAfter;
      run.finishedAt = new Date().toISOString();
      run.report = buildLabReport(run);
      setActiveLabRun(run);
    }

    return run;
  } finally {
    tickInFlight = false;
  }
}

async function runLabLoop() {
  if (trainingLoopActive) return;
  trainingLoopActive = true;
  while (getActiveLabRun()?.status === "running") {
    try {
      await tickLabRun();
    } catch (err) {
      const run = getActiveLabRun();
      if (run) {
        run.errors += 1;
        persistLabRun(run);
      }
      console.error("[evolution-lab]", err);
    }
    await new Promise((r) => setTimeout(r, 1200));
  }
  trainingLoopActive = false;
}

export function createLabRun(config = {}, startedBy = null) {
  const run = {
    id: randomUUID(),
    status: "running",
    startedBy,
    startedAt: Date.now(),
    config: {
      maxCount: Math.min(
        Math.max(
          config.maxCount ?? LAB_MIN_EXPERIMENTS,
          LAB_MIN_EXPERIMENTS
        ),
        LAB_MAX_EXPERIMENTS
      ),
      maxHours: config.maxHours ?? LAB_MAX_HOURS_DEFAULT,
      targetScore: config.targetScore ?? LAB_TARGET_SCORE,
      includeSensitive: config.includeSensitive !== false,
      categories: config.categories || null,
      maxRewrites: LAB_MAX_REWRITES,
    },
    results: [],
    apiCalls: 0,
    errors: 0,
    consecutivePass: 0,
    seen: new Set(),
    stopRequested: false,
    stopReason: null,
    trendResearch: null,
    smellStats: {},
    errorCounts: {},
    ruleEvolutions: [],
    report: null,
  };
  setActiveLabRun(run);
  return run;
}

export async function startLabRun(userId, config = {}) {
  if (getActiveLabRun()?.status === "running") {
    return {
      ok: false,
      message: "이미 실행 중인 연구가 있습니다.",
      runId: getActiveLabRun().id,
    };
  }

  const { isOpenAIConfigured } = await import("@/lib/llm/llmProvider");
  if (!isOpenAIConfigured()) {
    return {
      ok: false,
      message: "AI 생성 연결이 설정되지 않았습니다.",
    };
  }

  const run = createLabRun(
    {
      maxCount: config.maxCount,
      maxHours: config.durationHours ?? config.maxHours,
      targetScore: config.targetScore,
      includeSensitive: config.includeSensitive,
      categories: config.categories,
    },
    userId
  );

  runLabLoop().catch((err) => console.error("[evolution-lab loop]", err));

  return { ok: true, runId: run.id };
}

export function requestLabStop() {
  const run = getActiveLabRun();
  if (run) {
    run.stopRequested = true;
    persistLabRun(run);
  }
  return run;
}

export async function stopLabRun(runId) {
  const run = getActiveLabRun();
  if (!run || (runId && run.id !== runId)) {
    return { ok: false, message: "진행 중인 연구가 없습니다." };
  }
  requestLabStop();
  return { ok: true, runId: run.id };
}

export function getLabRunStatus() {
  const run = getActiveLabRun();
  if (!run) {
    return { status: "idle", report: null };
  }
  const total = run.config?.maxCount ?? LAB_MAX_EXPERIMENTS;
  const scores = run.results.map((r) => r.finalScore).filter(Number.isFinite);
  const avgScore = scores.length
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) /
      10
    : 0;

  return {
    status: run.status,
    runId: run.id,
    completed: run.results.length,
    total,
    avgScore,
    maxScore: scores.length ? Math.max(...scores) : 0,
    minScore: scores.length ? Math.min(...scores) : 0,
    consecutivePass: run.consecutivePass,
    apiCalls: run.apiCalls,
    stopReason: run.stopReason,
    report: run.report,
    errorRate: run.results.length ? run.errors / run.results.length : 0,
    phase: run.trendResearch ? "experiment" : "trend_research",
    progress: {
      completed: run.results.length,
      total,
      avgScore,
      consecutivePass: run.consecutivePass,
      apiCalls: run.apiCalls,
      currentLabel: run.results[run.results.length - 1]?.category
        ? `${run.results[run.results.length - 1].category} · 블로그`
        : "동향 분석",
    },
  };
}
