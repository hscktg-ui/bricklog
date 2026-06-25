/**
 * OpenAI + columnist sovereign 병목 진단
 * Run: node --import ./scripts/register-alias.mjs scripts/probe-openai-bottleneck.mjs
 */
import { loadEnvLocal } from "./lib/loadEnvLocal.mjs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { isOpenAIConfigured } from "../lib/llm/llmProvider.js";
import { callOpenAIChat } from "../lib/llm/openaiClient.js";
import { resolveWriterModel } from "../lib/llm/openaiCompletionParams.js";
import { generateColumnistSovereignPack } from "../lib/product/columnistSovereignEngine.js";
import { getE2eBearerToken } from "./lib/e2eAuth.js";
import {
  getGenerationTimeBudgetMs,
  getLlmLoopBudgetMs,
  isBriclogFastPipelineEnabled,
} from "../lib/config/briclogFastPipeline.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
loadEnvLocal(ROOT);

const SAMPLE_INPUT = {
  brandName: "국수나무",
  region: "여주",
  topic: "국수나무 돈까스 소개",
  title: "솔직 후기",
  industry: "음식점",
  blogLengthTier: "medium",
  v4Speaker: "plain_review",
  researchFacts: [
    { fact: "여주 국수나무는 바삭한 등심 돈까스가 대표 메뉴", source: "naver" },
    { fact: "점심시간 웨이팅이 길어 예약을 권장", source: "blog" },
    { fact: "매장 옆에 작은 정원 테라스가 있어 가족 나들이에 적합", source: "naver" },
    { fact: "돈까스 외에 우동·냉면 등 사이드 메뉴도 인기", source: "blog" },
  ],
};

async function pingOpenAI(label) {
  const t0 = Date.now();
  try {
    const raw = await callOpenAIChat(
      [{ role: "user", content: 'Return JSON only: {"ping":true}' }],
      { maxTokens: 30 }
    );
    return { label, ok: true, ms: Date.now() - t0, preview: raw.slice(0, 60) };
  } catch (err) {
    return {
      label,
      ok: false,
      ms: Date.now() - t0,
      status: err.status,
      code: err.code,
      message: String(err.message || err).slice(0, 240),
    };
  }
}

async function probeColumnistLocal() {
  const t0 = Date.now();
  try {
    const pack = await generateColumnistSovereignPack({
      ...SAMPLE_INPUT,
      forceColumnistSovereignFresh: true,
    });
    return {
      ok: Boolean(pack?.sections?.length),
      ms: Date.now() - t0,
      sections: pack?.sections?.length || 0,
      mode: pack?._meta?.generationMode,
      benchmark: pack?._meta?.visitReviewBenchmark?.score,
    };
  } catch (err) {
    return {
      ok: false,
      ms: Date.now() - t0,
      error: String(err.message || err).slice(0, 240),
      status: err.status,
    };
  }
}

async function probeProdBlog() {
  const auth = await getE2eBearerToken();
  if (!auth.ok) return { ok: false, reason: auth.reason };
  const payload = {
    ...SAMPLE_INPUT,
    researchEnabled: true,
    skipAutoPipeline: true,
    v2PreWriteVerified: true,
    v2ResearchReady: true,
  };
  const t0 = Date.now();
  const res = await fetch("https://briclog.ai/api/content/blog", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.token}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(360_000),
  });
  const body = await res.json();
  return {
    ms: Date.now() - t0,
    httpStatus: res.status,
    withheld: body.withheld,
    mode: body.mode,
    generationMode: body.meta?.generationMode || body.blogContent?._meta?.generationMode,
    sections: body.blogContent?.sections?.length || 0,
    openaiError: body.meta?.error,
    withholdReason: body.meta?.withholdReason,
    failReasons: body.meta?.failReasons,
    columnistBlocked: body.meta?.columnistDeliveryLawBlocked,
    fastPipeline: body.meta?.fastPipelineDelivery,
    regenAttempts: body.meta?.regenAttempts,
  };
}

async function main() {
  const report = {
    at: new Date().toISOString(),
    env: {
      openaiConfigured: isOpenAIConfigured(),
      model: resolveWriterModel(),
      fastPipeline: isBriclogFastPipelineEnabled(),
      llmLoopBudgetMs: getLlmLoopBudgetMs(),
      generationBudgetMs: getGenerationTimeBudgetMs(),
      columnistSovereign: process.env.BRICLOG_COLUMNIST_SOVEREIGN !== "false",
    },
    localOpenAiPing: await pingOpenAI("local"),
    localColumnist: isOpenAIConfigured() ? await probeColumnistLocal() : { skip: true },
    prodBlog: await probeProdBlog(),
  };

  console.log(JSON.stringify(report, null, 2));

  const blocked =
    !report.localOpenAiPing.ok ||
    (report.localColumnist.ok === false && !report.localColumnist.skip) ||
    (report.prodBlog.withheld && report.prodBlog.sections === 0);

  process.exit(blocked ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
