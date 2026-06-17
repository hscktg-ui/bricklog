/**
 * 조사 팩트 → 서사형 본문 송출 회귀
 */
import assert from "node:assert/strict";
import { buildMissionProseFallbackPack } from "../lib/llm/missionProseFallback.js";
import { applyV17PostWritePack } from "../lib/content/v17PostProcess.js";
import { finalizeContentQualityForDelivery } from "../lib/product/contentQualityDelivery.js";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { countBlogBodyCharsWithSpaces } from "../lib/prompts/engine/textUtils.js";
import {
  applyResearchNarrativeDeliveryPass,
  scoreResearchFactUtilization,
} from "../lib/content/researchNarrativeDeliveryEngine.js";
import {
  canReuseClientResearch,
  mergeResearchSessionIntoInput,
} from "../lib/content/researchSessionMerge.js";

const INPUT = {
  brandName: "스트레스리스",
  region: "파주",
  topic: "라인업 3종 전시",
  mainKeyword: "스트레스리스 라인업 3종 전시",
  industry: "가구",
  blogLengthTier: "medium",
  v4Speaker: "brand_intro",
  researchFacts: [
    { fact: "파주 매장에서 스트레스리스 3종 라인업 전시 중", source: "research" },
    { fact: "제로지·리클라이닝 각도를 매장에서 직접 체험 가능", source: "research" },
    { fact: "전시 기간·대상 모델은 매장 안내 기준", source: "research" },
    { fact: "프레임·매트리스 조합별 체험 동선이 다름", source: "research" },
    { fact: "주말 대기가 길어 평일 오전 방문이 수월", source: "research" },
  ],
};

let pack = buildMissionProseFallbackPack(INPUT);
pack = applyV17PostWritePack(pack, { input: INPUT, ...INPUT }, "blog");

const thinUtil = scoreResearchFactUtilization(pack, INPUT);
const narrative = applyResearchNarrativeDeliveryPass(pack, INPUT);
const util = scoreResearchFactUtilization(narrative, INPUT);

assert.ok(
  countBlogBodyCharsWithSpaces(narrative) >= countBlogBodyCharsWithSpaces(pack) * 0.95,
  "narrative pass should not shrink pack"
);
assert.ok(
  util.anchored >= thinUtil.anchored,
  `expected more fact anchors: ${thinUtil.anchored} -> ${util.anchored}`
);
assert.ok(util.ok, `research utilization not ok: ${JSON.stringify(util)}`);

const finalized = finalizeContentQualityForDelivery(narrative, INPUT, "blog");
const full = getBlogFullText(finalized);
assert.ok(full.replace(/\s/g, "").length >= 700, "expected substantive research-backed body");
assert.ok(
  !/여름\s*꽃|리본|알레르기\s*·\s*원재료/.test(full),
  "flower leak in furniture narrative"
);

const merged = mergeResearchSessionIntoInput(
  { brandName: "에이스침대", topic: "루체3 전시" },
  { facts: INPUT.researchFacts }
);
assert.ok(canReuseClientResearch(merged, { facts: INPUT.researchFacts }));
assert.ok(merged.researchFacts.length >= 5);

console.log("OK: research-narrative-delivery", {
  chars: countBlogBodyCharsWithSpaces(finalized),
  utilization: finalized._meta?.researchFactUtilization || util,
});
