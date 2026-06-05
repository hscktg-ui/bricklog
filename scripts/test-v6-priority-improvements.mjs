import { inferPublishPurpose } from "../lib/content/publishPurposeEngine.js";
import {
  extractStructureSignature,
  checkRecentStructureSimilarity,
} from "../lib/duplicate/contentSimilarity.js";
import { assessStructureVariety } from "../lib/content/structureVarietyGate.js";
import { computeFinalQualityScore, REGEN_BELOW_SCORE } from "../lib/pipeline/v2/finalQualityScore.js";
import { interpretContentBehavior } from "../lib/feedback/behaviorInterpretationEngine.js";
import { evaluateInsightAutoApply } from "../lib/feedback/humanOverrideEngine.js";
import {
  CONSTITUTION_V2_REGEN_BELOW_SCORE,
  CONSTITUTION_V2_TARGET_SCORE,
} from "../lib/constitution/constitutionThresholds.js";

if (CONSTITUTION_V2_REGEN_BELOW_SCORE !== 85 || CONSTITUTION_V2_TARGET_SCORE !== 95) {
  console.error("FAIL: v6 score thresholds");
  process.exit(1);
}

const flower = inferPublishPurpose({
  brandName: "그랩앤고플라워",
  topic: "여름에 사야할 꽃 소개",
  industry: "꽃집",
});
if (flower.purpose !== "정보 제공" || flower.structure !== "정보형") {
  console.error("FAIL: publish purpose", flower);
  process.exit(1);
}

const sigA = extractStructureSignature({
  sections: [
    { heading: "여름 꽃 종류", body: "a" },
    { heading: "보관 팁", body: "b" },
  ],
});
const sigB = extractStructureSignature({
  sections: [
    { heading: "여름 꽃 종류", body: "x" },
    { heading: "보관 팁", body: "y" },
  ],
});
if (checkRecentStructureSimilarity({ sections: [{ heading: "여름 꽃 종류" }, { heading: "보관 팁" }] }, [{ signature: sigB }]).percent < 70) {
  console.error("FAIL: structure similarity should be high for same headings");
  process.exit(1);
}

const variety = assessStructureVariety(
  {
    sections: [
      { heading: "여름 꽃 종류", body: "본문" },
      { heading: "보관 팁", body: "본문" },
    ],
  },
  {
    recentStructureArchives: [{ signature: sigA }],
  }
);
if (variety.ok) {
  console.error("FAIL: expected structure variety fail");
  process.exit(1);
}

const behavior = interpretContentBehavior(
  [
    { event_type: "rewrite" },
    { event_type: "rewrite" },
    { event_type: "rewrite" },
    { event_type: "rewrite" },
    { event_type: "rewrite" },
  ],
  { reaction: "good" }
);
if (behavior.satisfaction >= 50) {
  console.error("FAIL: rewrite heavy should lower satisfaction", behavior);
  process.exit(1);
}

const override = evaluateInsightAutoApply(
  { insight_type: "ad_tone_guard" },
  { conversionRate: 0.01, avgDwellSeconds: 12, sampleSize: 20 }
);
if (override.apply) {
  console.error("FAIL: human override should defer weak performance", override);
  process.exit(1);
}

const pack = {
  title: "테스트",
  sections: [
    { heading: "소개", body: "브랜드와 지역 맥락에서 주제를 정리했습니다. ".repeat(8) },
    { heading: "비교", body: "선택 기준을 장면으로 비교했습니다. ".repeat(8) },
    { heading: "정리", body: "확인할 포인트를 짧게 정리했습니다. ".repeat(6) },
  ],
  conclusion: "마무리",
};
const scoreLow = computeFinalQualityScore(pack, {
  brandName: "그랩앤고플라워",
  region: "평택",
  topic: "여름 꽃",
});
if (REGEN_BELOW_SCORE !== 85) {
  console.error("FAIL: regen below score export");
  process.exit(1);
}

console.log("OK: v6 priority improvements");
console.log("  purpose:", flower.purpose, flower.structure);
console.log("  structure variety blocked:", variety.percent + "%");
console.log("  behavior satisfaction:", behavior.satisfaction);
console.log("  quality total sample:", scoreLow.total, "needsRegen:", scoreLow.needsRegen);
