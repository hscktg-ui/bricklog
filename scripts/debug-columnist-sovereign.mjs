import { loadEnvLocal } from "./lib/loadEnvLocal.mjs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { callOpenAIChat } from "../lib/llm/openaiClient.js";
import { parseLlmBlogResponse } from "../lib/llm/postProcessLlmBlog.js";
import { createPromptContext } from "../utils/promptBuilder.js";
import {
  buildColumnistSovereignMessages,
  generateColumnistSovereignPack,
  COLUMNIST_SOVEREIGN_PASS_MIN,
} from "../lib/product/columnistSovereignEngine.js";
import { assessVisitReviewBenchmark } from "../lib/product/visitReviewBenchmarkRubric.js";
import { countBlogBodyCharsWithSpaces } from "../lib/prompts/engine/textUtils.js";
import { resolveBlogLengthTier } from "../lib/constants.js";
import { hasEngineSpamInPack } from "../lib/product/columnistEngineSpam.js";
import { getE2eBearerToken } from "./lib/e2eAuth.js";

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
    { fact: "매장 옆 작은 정원 테라스", source: "naver" },
  ],
};

async function debugRawCall() {
  const ctx = createPromptContext(INPUT);
  const msgs = buildColumnistSovereignMessages(INPUT, ctx, {});
  const t0 = Date.now();
  const raw = await callOpenAIChat(msgs, { temperature: 0.58, maxTokens: 6500 });
  const parsed = parseLlmBlogResponse(raw, ctx);
  const bench = assessVisitReviewBenchmark(parsed, INPUT);
  const tier = resolveBlogLengthTier("medium");
  const chars = countBlogBodyCharsWithSpaces(parsed);
  const shortMin = resolveBlogLengthTier("short").min;
  const columnistTierOk =
    bench.publishOk && chars >= Math.max(shortMin, Math.floor(tier.min * 0.75));
  return {
    phase: "raw_call",
    ms: Date.now() - t0,
    sections: parsed?.sections?.length,
    chars,
    tierMin: tier.min,
    tierOk: chars >= tier.min * 0.82,
    columnistTierOk,
    benchmark: bench.score,
    publishOk: bench.publishOk,
    hardFails: bench.hardFails,
    spam: hasEngineSpamInPack(parsed),
    title: parsed?.title?.slice(0, 60),
  };
}

async function debugFullPack() {
  const t0 = Date.now();
  const pack = await generateColumnistSovereignPack(INPUT);
  return {
    phase: "full_pack",
    ms: Date.now() - t0,
    sections: pack?.sections?.length || 0,
    mode: pack?._meta?.generationMode,
    benchmark: pack?._meta?.visitReviewBenchmark?.score,
    title: pack?.title?.slice(0, 60),
  };
}

async function debugProd() {
  const auth = await getE2eBearerToken();
  if (!auth.ok) return { phase: "prod", ok: false, reason: auth.reason };
  const t0 = Date.now();
  const res = await fetch("https://briclog.ai/api/content/blog", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.token}`,
    },
    body: JSON.stringify({
      ...INPUT,
      researchEnabled: true,
      skipAutoPipeline: true,
      v2PreWriteVerified: true,
      v2ResearchReady: true,
    }),
    signal: AbortSignal.timeout(360_000),
  });
  const body = await res.json();
  const blog = body.blogContent;
  return {
    phase: "prod",
    ms: Date.now() - t0,
    withheld: body.withheld,
    mode: body.mode,
    generationMode: body.meta?.generationMode || blog?._meta?.generationMode,
    sections: blog?.sections?.length || 0,
    openaiError: body.meta?.error,
    withholdReason: body.meta?.withholdReason,
    columnistSovereign: body.meta?.columnistSovereign,
    benchmark: blog?._meta?.visitReviewBenchmark?.score,
    title: blog?.title?.slice(0, 60),
    spam: blog?.sections?.length ? hasEngineSpamInPack(blog) : null,
  };
}

const report = {
  at: new Date().toISOString(),
  rawCall: await debugRawCall(),
  fullPack: await debugFullPack(),
  prod: await debugProd(),
};
console.log(JSON.stringify(report, null, 2));
