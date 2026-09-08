/**
 * 블로그 1건당 OpenAI 토큰·비용 실측
 * Run: node --import ./scripts/register-alias.mjs scripts/probe-blog-token-cost.mjs
 */
import { loadEnvLocal } from "./lib/loadEnvLocal.mjs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { getOpenAIClient } from "../lib/llm/openaiSdk.js";
import { buildChatCompletionCreateParams } from "../lib/llm/openaiCompletionParams.js";
import { resolveWriterModel } from "../lib/llm/openaiCompletionParams.js";
import { isOpenAIConfigured } from "../lib/llm/llmProvider.js";
import {
  buildColumnistSovereignMessages,
  generateColumnistSovereignPack,
} from "../lib/product/columnistSovereignEngine.js";
import { createPromptContext } from "../utils/promptBuilder.js";
import { getBlogWriteMaxTokens } from "../lib/config/briclogFastPipeline.js";
import { buildBlogGenerationMessages } from "../lib/llm/buildBlogPrompt.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
loadEnvLocal(ROOT);

const INPUT = {
  brandName: "국수나무",
  region: "여주",
  topic: "국수나무 돈까스 소개",
  title: "솔직 후기",
  industry: "음식점",
  blogLengthTier: "medium",
  forceColumnistSovereignFresh: true,
  researchFacts: [
    { fact: "여주 국수나무는 바삭한 등심 돈까스가 대표 메뉴", source: "naver" },
    { fact: "점심시간 웨이팅이 길어 예약을 권장", source: "blog" },
    { fact: "매장 옆 작은 정원 테라스가 있어 가족 나들이에 적합", source: "naver" },
    { fact: "돈까스 외에 우동·냉면 등 사이드 메뉴도 인기", source: "blog" },
  ],
};

const PRICING = {
  inputPerM: 5.0,
  outputPerM: 30.0,
  cachedInputPerM: 0.5,
};

function estChars(messages) {
  return messages.reduce((s, m) => s + String(m.content || "").length, 0);
}

function costUsd(usage) {
  const prompt = usage?.input_tokens || usage?.prompt_tokens || 0;
  const completion = usage?.output_tokens || usage?.completion_tokens || 0;
  const cachedPrompt = usage?.input_tokens_details?.cached_tokens || 0;
  const uncachedPrompt = Math.max(0, prompt - cachedPrompt);
  const inputCost =
    (uncachedPrompt / 1_000_000) * PRICING.inputPerM +
    (cachedPrompt / 1_000_000) * PRICING.cachedInputPerM;
  const outputCost = (completion / 1_000_000) * PRICING.outputPerM;
  return {
    prompt_tokens: prompt,
    completion_tokens: completion,
    cached_prompt_tokens: cachedPrompt,
    total_tokens: usage?.total_tokens || prompt + completion,
    inputCostUsd: inputCost,
    outputCostUsd: outputCost,
    totalCostUsd: inputCost + outputCost,
  };
}

async function callWithUsage(messages, options = {}) {
  const client = getOpenAIClient();
  const params = buildChatCompletionCreateParams({
    model: resolveWriterModel(options.model),
    messages,
    temperature: options.temperature ?? 0.58,
    maxTokens: options.maxTokens ?? 6500,
    responseFormat: { type: "json_object" },
  });
  const t0 = Date.now();
  const response = await client.responses.create(params);
  return {
    ms: Date.now() - t0,
    usage: response.usage,
    outputChars: String(response.output_text || "").length,
  };
}

async function main() {
  if (!isOpenAIConfigured()) {
    console.error("OPENAI not configured");
    process.exit(1);
  }

  const ctx = createPromptContext(INPUT);
  const columnistMsgs = buildColumnistSovereignMessages(INPUT, ctx, {});
  const legacyMax = getBlogWriteMaxTokens("medium");

  const report = {
    at: new Date().toISOString(),
    model: resolveWriterModel(),
    pricing: PRICING,
    promptEstimates: {
      columnistSovereignChars: estChars(columnistMsgs),
      columnistSovereignApproxInputTokens: Math.round(estChars(columnistMsgs) / 2.5),
    },
    calls: {},
    scenarios: {},
  };

  report.calls.columnistSingle = await callWithUsage(columnistMsgs, {
    temperature: 0.58,
    maxTokens: 6500,
  });
  report.calls.columnistSingle.cost = costUsd(report.calls.columnistSingle.usage);

  // legacy orchestrator path (1 write attempt)
  try {
    const buildCtx = { ...ctx, input: INPUT, blogLengthTier: "medium" };
    const legacyMsgs = buildBlogGenerationMessages({
      ...buildCtx,
      sensitiveCompliance: { isSensitive: false },
      pipeline: { regenNote: null },
    });
    report.promptEstimates.legacyOrchestratorChars = estChars(legacyMsgs);
    report.calls.legacyOrchestratorSingle = await callWithUsage(legacyMsgs, {
      temperature: 0.7,
      maxTokens: legacyMax,
    });
    report.calls.legacyOrchestratorSingle.cost = costUsd(
      report.calls.legacyOrchestratorSingle.usage
    );
  } catch (err) {
    report.calls.legacyOrchestratorSingle = { error: String(err.message || err) };
  }

  // full columnist pack (may retry up to 3x)
  const packT0 = Date.now();
  const pack = await generateColumnistSovereignPack(INPUT);
  report.scenarios.columnistFullPack = {
    ms: Date.now() - packT0,
    sections: pack?.sections?.length || 0,
    mode: pack?._meta?.generationMode,
    benchmark: pack?._meta?.visitReviewBenchmark?.score,
    note: "generateColumnistSovereignPack does not expose usage — cost ≈ 1–3× columnistSingle",
  };

  const single = report.calls.columnistSingle.cost;
  report.scenarios.perBlogEstimates = {
    columnistSovereign_typical_1call: single,
    columnistSovereign_worst_3calls: {
      prompt_tokens: single.prompt_tokens * 3,
      completion_tokens: single.completion_tokens * 3,
      total_tokens: single.total_tokens * 3,
      totalCostUsd: single.totalCostUsd * 3,
    },
    prodBlog_columnistOnly_mid: {
      totalCostUsd: single.totalCostUsd * 1.5,
      note: "prod: columnist 1–2 calls typical",
    },
    prodBlog_columnistPlusWriter_mid: {
      totalCostUsd: single.totalCostUsd * 2.2,
      note: "columnist + writer expansion/polish 0–1 extra call",
    },
    prodBlog_worstCase: {
      totalCostUsd: single.totalCostUsd * 4,
      note: "columnist 3× + writer 1× rough upper bound",
    },
    krwAt1400: {
      typical: Math.round(single.totalCostUsd * 1.5 * 1400),
      worst: Math.round(single.totalCostUsd * 4 * 1400),
      unit: "KRW per blog",
    },
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
