/**
 * Brand depth P0 — brief · weave · context beat
 */
import assert from "node:assert/strict";
import {
  attachBrandDepthAuthoritativeBrief,
  buildBrandDepthAuthoritativeBrief,
  hasRichBrandDepthInput,
} from "../lib/product/brandAuthoritativeBrief.js";
import {
  needsGenerationContextBeat,
  hasRichGenerationContext,
  applyContextBeatToInput,
} from "../lib/product/generationContextBeat.js";
import { weaveResearchFactsIntoPack } from "../lib/content/researchGroundedHumanPack.js";
import { getBlogFullText } from "../utils/qualityCheck.js";

const input = {
  brandName: "홍대카페",
  region: "서울 마포",
  topic: "신규 오픈 브런치",
  industry: "카페",
  storeFeatures: "시즌 브런치 9800원 · 창가 좌석 · 원두 로스팅",
  researchFacts: [
    { fact: "홍대카페 — 시즌 브런치 9800원", axis: "brand", source: "store_features" },
    { fact: "홍대카페 — 창가 4인석", axis: "brand", source: "store_features" },
    { fact: "마포구 카페 밀집", axis: "region", source: "naver" },
  ],
};

const brief = buildBrandDepthAuthoritativeBrief(input);
assert.match(brief, /브랜드 깊이/);
assert.match(brief, /9800/);

const enriched = attachBrandDepthAuthoritativeBrief(input);
assert.equal(enriched._brandDepthBriefUsed, true);
assert.match(enriched._canonicalBrief, /9800/);

assert.equal(hasRichBrandDepthInput(input), true);
assert.equal(needsGenerationContextBeat(input), false);

const thin = { brandName: "테스트", region: "서울", topic: "오픈", industry: "카페" };
assert.equal(needsGenerationContextBeat(thin), true);

const beatApplied = applyContextBeatToInput(thin, "시즌 메뉴 · 창가 좌석 · 9800원");
assert.equal(hasRichGenerationContext(beatApplied), true);

const pack = {
  title: "제목",
  sections: [
    { heading: "도입", body: "마포구 카페 밀집 지역에서 운영 방식을 정리합니다." },
    { heading: "본문", body: "방문객이 많은 편입니다." },
  ],
  conclusion: "마무리",
};

const woven = weaveResearchFactsIntoPack(pack, input);
const full = getBlogFullText(woven);
assert.match(full, /9800|창가|브런치/, "brand facts woven when missing from body");

console.log("OK test-brand-depth-p0");
