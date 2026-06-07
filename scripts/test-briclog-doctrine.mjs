/**
 * BRICLOG Doctrine — Human Writer · Brand Memory · Anti SEO · Editor Principle
 */
import { buildBriclogMissionPromptBlock } from "../lib/product/briclogMission.js";
import {
  buildSpeakerPurposeExplainBrief,
  assessContentExplainabilityForPublish,
  BRICLOG_CONTENT_NORTH_STAR,
} from "../lib/product/briclogContentDoctrine.js";
import { assertCompleteBlogPackForDelivery } from "../lib/product/completeDeliveryGate.js";
import { buildMasterSystemV6Brief } from "../lib/product/briclogMasterSystemV6.js";
import { applyAntiSeoSpamGate, scoreAntiSeoSpam } from "../lib/content/antiSeoSpamGate.js";
import { countTokenMentions } from "../lib/product/antiSeoSpamEngine.js";

const mission = buildBriclogMissionPromptBlock();
const required = [
  "BRICLOG CONTENT DOCTRINE",
  "North Star",
  "SPEAKER · PURPOSE · EXPLAIN",
  "새로운 사실을 전달",
  "좋은 설명을 우선",
  "주제를 설명할 수 없는",
  "ULTIMATE CONTENT ENGINE V20",
  "브랜드를 축적하는 AI 콘텐츠 팀",
  "Reviewer AI",
  "SIGNATURE WRITING ENGINE",
  "HUMAN WRITER ENGINE",
  "BRAND MEMORY PRIORITY",
  "ANTI SEO SPAM ENGINE",
  "EDITOR PRINCIPLE",
  "BRAND JOURNALIST DIRECTIVE",
  "브랜드 조사 시스템",
  "브랜드 기자이자 편집자",
  "연속된 이야기",
  "10년차 브랜드 에디터",
  "HUMAN BELIEF",
  "관점을 설명",
  "문제",
  "이유",
  "비교 기준",
];

const v6 = buildMasterSystemV6Brief();
if (!v6.includes("MASTER SYSTEM v6.2") || !v6.includes("기록이 쌓이면")) {
  console.error("FAIL: master system v6 brief missing");
  process.exit(1);
}

for (const needle of required) {
  if (!mission.includes(needle)) {
    console.error("FAIL: mission missing", needle);
    process.exit(1);
  }
}

const speakerBrief = buildSpeakerPurposeExplainBrief({
  brandName: "에이스침대",
  region: "파주",
  topic: "루체3 전시소식",
  publishPurpose: "행사 홍보",
  v4Speaker: "real_use",
});
if (!speakerBrief.includes(BRICLOG_CONTENT_NORTH_STAR)) {
  console.error("FAIL: speaker purpose brief missing north star");
  process.exit(1);
}

const thinGate = assessContentExplainabilityForPublish({
  brandName: "테스트",
  region: "서울",
  topic: "소개",
  researchFacts: [{ fact: "짧음", source: "research" }],
});
if (thinGate.ok) {
  console.error("FAIL: thin topic should be withheld");
  process.exit(1);
}

const aceGate = assessContentExplainabilityForPublish({
  brandName: "에이스침대",
  region: "파주",
  topic: "루체3 전시소식",
  researchFacts: [
    { fact: "파주 매장 루체3 전시", source: "research" },
    { fact: "전시 기간 매장 안내", source: "research" },
  ],
});
if (!aceGate.ok) {
  console.error("FAIL: ace topic should be explainable", aceGate.reasons);
  process.exit(1);
}

const stubComplete = assertCompleteBlogPackForDelivery(
  {
    title: "테스트",
    sections: [{ heading: "주제", body: "짧음" }],
    _meta: { generationMode: "form_proxy" },
  },
  { brandName: "테스트", region: "서울", topic: "소개", blogLengthTier: "medium" }
);
if (stubComplete.ok) {
  console.error("FAIL: form_proxy stub should be blocked");
  process.exit(1);
}

const spammy = "템퍼 ".repeat(6) + "평택 ".repeat(5) + "모션베드 ".repeat(4);
const pack = {
  title: "템퍼 평택 모션베드",
  sections: [{ heading: "본문", body: spammy }],
};
const gated = applyAntiSeoSpamGate(pack, {
  brandName: "템퍼",
  region: "평택",
  topic: "모션베드",
});
const after = gated.sections[0].body;
if (countTokenMentions(after, "템퍼") > 3) {
  console.error("FAIL: brand repeat not softened", countTokenMentions(after, "템퍼"));
  process.exit(1);
}
const score = scoreAntiSeoSpam(after, {
  brandName: "템퍼",
  region: "평택",
  topic: "모션베드",
});
if (!score.ok && countTokenMentions(after, "평택") > 3) {
  console.error("FAIL: anti spam score", score.overused);
  process.exit(1);
}

console.log("OK: briclog doctrine — memory priority, anti spam, editor principle");
console.log("  brand mentions after gate:", countTokenMentions(after, "템퍼"));
