/**
 * Speaker Voice Lock + SQV + delivery hardening regression
 */
import { resolveSpeakerDisplayLabel } from "../lib/persona/speakerVoiceLock.js";
import {
  shouldApplyExperienceVoiceEnhancement,
  buildPersonaNarrativeFlowBrief,
} from "../lib/persona/speakerVoiceLock.js";
import { scoreHumanBelief } from "../lib/product/humanBeliefEngine.js";
import { applyHumanConversationalVoice } from "../lib/content/humanConversationalVoice.js";
import { deliverBlogDespiteGate } from "../lib/product/deliverySoftPass.js";
import { computeContentQualityValue } from "../lib/product/contentQualityValue.js";
import { slimBlogApiPayload } from "../lib/generation/slimBlogApiPayload.js";
import {
  getResearchDepthMaxRounds,
  getNaverMaxQueries,
} from "../lib/config/briclogFastPipeline.js";
import { buildSpeakerPurposeExplainBrief } from "../lib/product/briclogContentDoctrine.js";

const brandIntro = { v4Speaker: "brand_intro", brandName: "에이스침대", region: "파주", topic: "루체3" };
const realUse = { v4Speaker: "real_use", brandName: "에이스침대", region: "파주", topic: "루체3" };

if (resolveSpeakerDisplayLabel(brandIntro) !== "브랜드 소개형") {
  console.error("FAIL: brand_intro label", resolveSpeakerDisplayLabel(brandIntro));
  process.exit(1);
}

const brief = buildSpeakerPurposeExplainBrief(brandIntro);
if (!brief.includes("브랜드 소개형")) {
  console.error("FAIL: doctrine brief missing v4 label", brief.slice(0, 120));
  process.exit(1);
}

if (shouldApplyExperienceVoiceEnhancement(brandIntro)) {
  console.error("FAIL: brand_intro should not get experience voice");
  process.exit(1);
}
if (!shouldApplyExperienceVoiceEnhancement(realUse)) {
  console.error("FAIL: real_use should get experience voice");
  process.exit(1);
}

const brandNarrative = buildPersonaNarrativeFlowBrief(brandIntro);
if (/방문·체험|방문자 후기 톤 금지/.test(brandNarrative) === false) {
  console.error("FAIL: brand narrative should forbid visit tone", brandNarrative);
  process.exit(1);
}

const expertText =
  "에이스침대 파주 매장에서 루체3 전시 소식을 정리해 봤습니다. 행사 기간과 전시 구성을 기준으로 보면 방문 전에 확인할 포인트가 분명합니다. 매장 안내와 주차는 공식 안내를 참고하면 됩니다.";
const brandBelief = scoreHumanBelief(expertText, { input: brandIntro });
if (!brandBelief.ok && brandBelief.issues.includes("field_smell_low")) {
  console.error("FAIL: brand_intro should not require field smell", brandBelief);
  process.exit(1);
}

const pack = {
  title: "테스트",
  sections: [
    { heading: "맥락", body: expertText },
    { heading: "정리", body: "전시 일정과 구성을 미리 확인하면 방문 동선을 짧게 잡을 수 있습니다." },
  ],
  conclusion: "공식 안내 기준으로 확인하세요.",
};
const voiced = applyHumanConversationalVoice({ ...pack }, brandIntro);
const fullBefore = pack.sections[2]?.body || pack.sections[1]?.body;
const fullAfter = voiced.sections[1]?.body || "";
if (voiced._meta?.humanConversationalVoice) {
  console.error("FAIL: conversational voice applied to brand_intro");
  process.exit(1);
}

const preview = deliverBlogDespiteGate(
  brandIntro,
  pack,
  { ok: false, reasons: ["post_write_quality_failed"] },
  {}
);
if (preview !== null) {
  console.error("FAIL: deliverBlogDespiteGate should be blocked under mission");
  process.exit(1);
}

const sqv = computeContentQualityValue(pack, brandIntro);
if (!sqv.version || typeof sqv.score !== "number") {
  console.error("FAIL: SQV missing", sqv);
  process.exit(1);
}

const slim = slimBlogApiPayload({
  brandName: "에이스침대",
  styleAnchors: [{ title: "과거", snippet: "허리가 아파서 침대부터 바꿨어요." }],
  styleAnchorBrief: "【STYLE ANCHOR】과거 톤",
  coverageMapBrief: "커버리지 요약",
  customerQuestionBrief: "고객 질문",
  researchFacts: [{ fact: "루체3 전시", source: "research" }],
});
if (!slim.styleAnchors?.length || !slim.coverageMapBrief || !slim.customerQuestionBrief) {
  console.error("FAIL: slim payload dropped voice context", slim);
  process.exit(1);
}

if (getResearchDepthMaxRounds(false) < 1) {
  console.error("FAIL: mission should allow research depth under fast pipeline");
  process.exit(1);
}
if (getNaverMaxQueries() < 6) {
  console.error("FAIL: mission naver queries too low", getNaverMaxQueries());
  process.exit(1);
}

console.log("OK: speaker voice lock — label, belief, delivery, sqv, slim payload");
console.log("  brand belief score:", brandBelief.score, "sqv:", sqv.score);
