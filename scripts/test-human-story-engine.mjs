/**
 * HUMAN STORY ENGINE — 도입 X/O · 게이트 · 폴백
 */
process.env.BRICLOG_MISSION = "true";

import {
  buildHumanStoryEnginePromptBlock,
  buildHumanStoryProblemOpening,
  isHumanStoryProductFirstOpening,
  scoreHumanStoryOpening,
  ensureHumanStoryOpeningBody,
} from "../lib/product/humanStoryEngine.js";
import { applySignatureWritingGate } from "../lib/content/signatureWritingGate.js";
import { buildMissionProseFallbackPack } from "../lib/llm/missionProseFallback.js";

const brief = buildHumanStoryEnginePromptBlock();
if (!brief.includes("HUMAN STORY") && !brief.includes("사람의 상황")) {
  console.error("FAIL: human story prompt block");
  process.exit(1);
}

if (!isHumanStoryProductFirstOpening("모션베드는 헤드 조절이 가능합니다.")) {
  console.error("FAIL: should detect product-first bed");
  process.exit(1);
}
if (isHumanStoryProductFirstOpening("아침에 일어나면 허리가 먼저 아픈 사람들이 있다.")) {
  console.error("FAIL: should accept human problem opening");
  process.exit(1);
}

const salonOpen = buildHumanStoryProblemOpening({
  industry: "미용실",
  brandName: "루트앤컷",
  topic: "두피 염색",
});
if (!/염색|두피/.test(salonOpen)) {
  console.error("FAIL: salon opening", salonOpen);
  process.exit(1);
}

const pack = {
  sections: [
    {
      heading: "브랜드 소개",
      body: "템퍼는 두피 케어를 제공합니다. 제품은 이렇습니다.",
    },
  ],
};
const gated = applySignatureWritingGate(pack, {
  brandName: "템퍼",
  industry: "가구",
  topic: "모션베드",
});
const body0 = gated.sections[0].body;
if (!/허리|침대|바꿀/.test(body0) && !/왜/.test(body0)) {
  console.error("FAIL: gate should prepend human problem", body0.slice(0, 120));
  process.exit(1);
}
if (/두피\s*케어를\s*제공/.test(body0.split("\n\n")[0])) {
  console.error("FAIL: product-first para should not lead", body0.slice(0, 80));
  process.exit(1);
}

const fallback = buildMissionProseFallbackPack({
  brandName: "루트앤컷",
  region: "강남",
  industry: "미용실",
  topic: "두피 염색",
  blogLengthTier: "short",
});
const fbFirst = fallback.sections?.[0]?.body?.split(/\n\n+/)?.[0] || "";
if (!/염색|두피|걱정/.test(fbFirst)) {
  console.error("FAIL: mission fallback salon opening", fbFirst);
  process.exit(1);
}

const scored = scoreHumanStoryOpening(
  "생화 꽃다발을 판매합니다. 가격은 합리적입니다.",
  { industry: "꽃집" }
);
if (scored.ok) {
  console.error("FAIL: product-first should score fail");
  process.exit(1);
}

const fixed = ensureHumanStoryOpeningBody(
  "생화 꽃다발을 판매합니다.",
  { industry: "꽃집", topic: "꽃다발" }
);
if (!/꽃을 사야|막히|꽃집/.test(fixed)) {
  console.error("FAIL: ensure opening", fixed);
  process.exit(1);
}

console.log("OK: human story engine — detect, gate, fallback, ensure");
console.log("  salon opening:", salonOpen.slice(0, 48) + "…");
