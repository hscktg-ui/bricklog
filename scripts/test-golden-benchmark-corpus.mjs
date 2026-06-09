/**
 * Golden Benchmark 코퍼스 — 업종별 벤치마크 존재·금칙어 없음
 */
import assert from "node:assert/strict";
import { GOLDEN_BENCHMARK_ARTICLES } from "../lib/golden/goldenBenchmarkArticles.js";
import { getGoldenSamplesForInput } from "../lib/golden/goldenDatasetStore.js";
import { buildGoldenReferencePromptBlock } from "../lib/golden/goldenPromptReference.js";
import { buildBriclogAuthorMissionBlock } from "../lib/golden/goldenAuthorDirective.js";

const INDUSTRIES = [
  "flower_shop",
  "cafe",
  "furniture",
  "medical",
  "marketing_agency",
];

assert.ok(GOLDEN_BENCHMARK_ARTICLES.length >= 18, `corpus size ${GOLDEN_BENCHMARK_ARTICLES.length}`);

for (const ind of INDUSTRIES) {
  const n = getGoldenSamplesForInput({ industry: ind }, 10).length;
  assert.ok(n >= 2, `${ind} needs 2+ benchmarks got ${n}`);
}

for (const s of GOLDEN_BENCHMARK_ARTICLES) {
  assert.ok(!/비교가\s*수월해요/.test(s.content), `forbidden in ${s.id}`);
  assert.ok(!/좋은내용|브랜드명/.test(s.content), `placeholder in ${s.id}`);
  assert.ok((s.brand_presence_score || 0) >= 85, `score low ${s.id}`);
}

const block = buildGoldenReferencePromptBlock({ industry: "카페", topic: "여름 메뉴" });
assert.ok(block.includes("BRICLOG 집필 미션"));
assert.ok(block.includes("참고") || block.includes("벤치"));

const adaptiveBlock = buildGoldenReferencePromptBlock({ industry: "반려동물", topic: "강아지 간식" });
assert.ok(adaptiveBlock.includes("DNA·조사"));
assert.ok(!getGoldenSamplesForInput({ industry: "pet" }, 5).length);

const mission = buildBriclogAuthorMissionBlock({ industry: "꽃집" });
assert.ok(mission.includes("편집장"));

console.log("OK: golden-benchmark-corpus", GOLDEN_BENCHMARK_ARTICLES.length, "articles");
