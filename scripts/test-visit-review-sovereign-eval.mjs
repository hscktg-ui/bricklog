/**
 * Visit Review Sovereign — GPT 벤치마크 채점 + 신규 브랜드 생성 평가
 *
 * Usage:
 *   node --import ./scripts/register-alias.mjs scripts/test-visit-review-sovereign-eval.mjs
 *   BRICLOG_SKIP_LIVE=1  — 벤치마크·템플릿 채점만 (API 호출 생략)
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import assert from "node:assert/strict";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
try {
  for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch {
  /* ignore */
}

import { getBlogFullText } from "../utils/qualityCheck.js";
import {
  assessVisitReviewBenchmark,
  formatVisitReviewBenchmarkReport,
  GPT_YEOJU_BENCHMARK_PACK,
} from "../lib/product/visitReviewBenchmarkRubric.js";
import {
  generateVisitReviewSovereignPack,
  isVisitReviewSovereignEnabled,
} from "../lib/product/visitReviewSovereignEngine.js";
import { buildMissionProseFallbackPack } from "../lib/llm/missionProseFallback.js";
import { isOpenAIConfigured } from "../lib/llm/llmProvider.js";
import { detectVisitReviewTemplateContamination } from "../lib/content/visitReviewTopicGate.js";

process.env.BRICLOG_MISSION = "true";

const skipLive = process.env.BRICLOG_SKIP_LIVE === "1" || process.env.BRICLOG_SKIP_LIVE === "true";

const yeojuInput = {
  brandName: "여주목마",
  region: "여주",
  topic: "실외 수영장 오픈소식 솔직후기",
  industry: "레저/체험",
  blogLengthTier: "medium",
  researchFacts: [
    { fact: "식사·카페·휴식 공간과 실외 수영장이 한 공간에서 이어지는 복합 문화공간", source: "research" },
    { fact: "가족 단위 방문객에게 물놀이 후 식사·휴식 동선이 편함", source: "research" },
    { fact: "운영 일정·이용 요금은 시즌에 따라 달라질 수 있음", source: "research" },
  ],
};

/** 여주목마와 다른 신규 테스트 케이스 */
const NEW_CASE = {
  brandName: "평창 대관령 양떼목장",
  region: "평창",
  topic: "봄 어린이 체험 프로그램 오픈, 직접 다녀온 후기",
  mainKeyword: "대관령 양떼목장",
  industry: "레저/체험",
  blogLengthTier: "medium",
  v4Speaker: "plain_review",
  researchFacts: [
    { fact: "봄 시즌 어린이 먹이 주기·양 친구 체험 프로그램 신설", source: "research" },
    { fact: "목장 전망대에서 산책로와 양 떼 사육 구역이 한눈에 보임", source: "research" },
    { fact: "주말·성수기에는 사전 예약 없이 대기 시간이 길어질 수 있음", source: "research" },
    { fact: "체험 후 목장 카페에서 지역 우유·치즈 간식 판매", source: "research" },
  ],
};

console.log("--- 1) GPT 벤치마크 (목표 품질) ---");
const gptBench = assessVisitReviewBenchmark(GPT_YEOJU_BENCHMARK_PACK, yeojuInput);
console.log(formatVisitReviewBenchmarkReport(gptBench, "GPT 벤치마크 (여주목마)"));
assert.ok(gptBench.score >= 75, `GPT 벤치마크는 75+ 여야 함 (got ${gptBench.score})`);
assert.ok(gptBench.publishOk, "GPT 벤치마크 publishOk");

console.log("\n--- 2) 엔진 템플릿 스팸 (나쁜 예) ---");
const templatePack = {
  title: "여주목마 솔직 후기",
  sections: [
    {
      heading: "왜 지금 는지",
      body: "여주목마 안내 볼 때 어떤 순서로 비교하면 덜 헷갈릴까요? 대표 서비스 방문·상담 전 확인할 것입니다.",
    },
    {
      heading: "비교 기준",
      body: "비교가 수월합니다. 목적별로 나눠 보면 기준이 조금씩 보였어요.",
    },
  ],
};
const templateScore = assessVisitReviewBenchmark(templatePack, yeojuInput);
console.log(formatVisitReviewBenchmarkReport(templateScore, "템플릿 스팸"));
assert.ok(templateScore.score < 60, `템플릿 스팸은 60 미만 (got ${templateScore.score})`);
assert.equal(templateScore.publishOk, false);

console.log("\n--- 3) Mission fallback 차단 (visit_review_sovereign_required) ---");
const withheld = buildMissionProseFallbackPack(yeojuInput);
if (isOpenAIConfigured()) {
  assert.ok(
    withheld._meta?.researchFirstWithheld &&
      withheld._meta?.withholdReason === "visit_review_sovereign_required",
    "OpenAI 설정 시 방문 후기는 템플릿 폴백 대신 sovereign 필요"
  );
  console.log("OK: visit_review_sovereign_required withheld");
} else {
  const contam = detectVisitReviewTemplateContamination(withheld, yeojuInput);
  if (withheld.sections?.length) {
    console.log(
      "WARN: OpenAI 미설정 — 로컬은 템플릿 폴백 가능 (contam.ok=" + contam.ok + ")"
    );
  } else {
    console.log("OK: withheld locally (" + (withheld._meta?.withholdReason || "empty") + ")");
  }
}

if (skipLive || !isVisitReviewSovereignEnabled()) {
  console.log("\n--- 4) LIVE 생성 스킵 (BRICLOG_SKIP_LIVE 또는 OpenAI 미설정) ---");
  console.log("OK visit-review-sovereign-eval (offline)");
  process.exit(0);
}

console.log("\n--- 4) Sovereign LIVE 생성 — 신규 케이스 ---");
console.log(`브랜드: ${NEW_CASE.brandName} / 지역: ${NEW_CASE.region} / 주제: ${NEW_CASE.topic}`);

const sovereignPack = await generateVisitReviewSovereignPack(NEW_CASE);
assert.ok(sovereignPack?.sections?.length >= 3, "sovereign 생성 실패");

const liveScore = assessVisitReviewBenchmark(sovereignPack, NEW_CASE);
console.log(formatVisitReviewBenchmarkReport(liveScore, "Sovereign LIVE (평창 양떼목장)"));

console.log("\n--- 본문 미리보기 (앞 800자) ---");
const preview = getBlogFullText(sovereignPack).slice(0, 800);
console.log(preview);
console.log("...");

assert.ok(
  liveScore.score >= 70,
  `Sovereign LIVE는 70+ 목표 (got ${liveScore.score}, grade ${liveScore.grade})`
);
assert.ok(liveScore.dimensions.spam.score >= 15, "엔진 스팸 없어야 함");
assert.ok(
  liveScore.dimensions.structure.score >= 12,
  `구조 점수 12+ (got ${liveScore.dimensions.structure.score})`
);

const full = getBlogFullText(sovereignPack);
assert.ok(
  /양|목장|체험|봄/.test(full),
  "조사 주제(양떼목장·봄 체험)가 본문에 반영되어야 함"
);
assert.ok(
  !/덜\s*헷갈릴까요|방문·상담|비교가\s*수월/.test(full),
  "템플릿 스팸 문구 금지"
);

console.log("\nOK visit-review-sovereign-eval");
