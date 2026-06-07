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
  scrubSpeakerMismatchTitleOpening,
  scoreSpeakerSurfaceAlignment,
} from "../lib/persona/speakerVoiceLock.js";
import { applyFurnitureExhibitionPackPolish } from "../lib/product/furnitureExhibitionEngine.js";
import {
  getResearchDepthMaxRounds,
  getNaverMaxQueries,
} from "../lib/config/briclogFastPipeline.js";
import { buildSpeakerPurposeExplainBrief } from "../lib/product/briclogContentDoctrine.js";

const brandIntro = {
  v4Speaker: "brand_intro",
  brandName: "에이스침대",
  region: "파주",
  topic: "루체3 전시소식",
  industry: "가구/침대",
};
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

const visitTitlePack = {
  title: "파주 에이스침대 루체3 전시소식 직접 다녀온 후기",
  representativeTitle: "파주 에이스침대 루체3 전시소식 직접 다녀온 후기",
  sections: [
    {
      heading: "도입",
      body: "파주 에이스침대 루체3 전시소식 직접 다녀온 후기 쇼룸에서 직접 본 점을 정리했어요.",
    },
    { heading: "정리", body: "전시 구성과 안내는 매장 공식 기준으로 확인하면 됩니다." },
  ],
};
const scrubbed = scrubSpeakerMismatchTitleOpening(visitTitlePack, brandIntro);
if (/직접\s*다녀|다녀온\s*후기/.test(scrubbed.title || "")) {
  console.error("FAIL: title still visit-review after scrub", scrubbed.title);
  process.exit(1);
}
const surface = scoreSpeakerSurfaceAlignment(scrubbed, brandIntro);
if (!surface.ok) {
  console.error("FAIL: surface alignment after scrub", surface);
  process.exit(1);
}

const prodOpeningPack = {
  title: "파주 에이스침대, 루체3 전시",
  representativeTitle: "파주 에이스침대, 루체3 전시",
  sections: [
    {
      heading: "도입",
      body: [
        "파주 에이스침대, 루체3 전시소식을 메모해 뒀어요.",
        "신혼침대-에이스침대 파주 매장: 템바보드 헤드보드가 헤드…",
        "파주 에이스침대 쇼룸에서 루체3 전시소식 전시·체험 구성을 직접 확인했어요.",
        "루체3 전시 구성은 매장 안내 기준으로 확인하면 됩니다.",
      ].join(" "),
    },
    { heading: "정리", body: "전시 일정과 구성을 미리 확인하면 방문 동선을 짧게 잡을 수 있습니다." },
  ],
};
const prodScrubbed = scrubSpeakerMismatchTitleOpening(prodOpeningPack, brandIntro);
const prodOpen = prodScrubbed.sections?.[0]?.body || "";
if (/메모(?:해|한)\s*뒀|템바보드|신혼침대-|직접\s*확인|쇼룸(?:에서|)\s*.{0,20}직접/.test(prodOpen)) {
  console.error("FAIL: prod-like opening still contaminated", prodOpen.slice(0, 200));
  process.exit(1);
}
const prodSurface = scoreSpeakerSurfaceAlignment(prodScrubbed, brandIntro);
if (!prodSurface.ok) {
  console.error("FAIL: prod-like surface after scrub", prodSurface);
  process.exit(1);
}
if (!prodScrubbed._meta?.speakerSurfaceScrub) {
  console.error("FAIL: prod-like pack should be marked scrubbed");
  process.exit(1);
}

const softProdPack = {
  title: "파주 에이스침대, 루체3 전시",
  representativeTitle: "파주 에이스침대, 루체3 전시",
  sections: [
    {
      heading: "도입",
      body: [
        "파주 에이스침대, 루체3 전시 파주 에이스침대 루체3 전시소식 안내",
        "루체3 전시소식 기준으로 기준으로 신혼 준비를 하다 보면 침실만큼 고민되는 공간이 없다.",
        "체험·시연 후 바로 결정하지 않고 하루 두고 메모를 다시 읽어 봤어요.",
        "10분 넘게 누워보니 허리 지지감과 뒤척임 때 소음·진동 전달이 꽤 달랐어요.",
        "처음엔 인테리어·이사·교체 기준만 보다가, 쇼룸에서 보니 감이 왔어요.",
      ].join(" "),
    },
    { heading: "정리", body: "전시 일정과 구성을 미리 확인하면 방문 동선을 짧게 잡을 수 있습니다." },
  ],
};
const softScrubbed = scrubSpeakerMismatchTitleOpening(softProdPack, brandIntro);
const softOpen = softScrubbed.sections?.[0]?.body || "";
if (
  /누워\s*보|메모(?:를|)\s*.{0,12}읽|쇼룸(?:에서|)\s*.{0,20}보(?:니|고)|감이\s*왔|체험(?:·|\/)?\s*시연|뒤척임|기준으로\s+기준으로/.test(
    softOpen
  )
) {
  console.error("FAIL: soft experiential opening still present", softOpen.slice(0, 240));
  process.exit(1);
}
const softSurface = scoreSpeakerSurfaceAlignment(softScrubbed, brandIntro);
if (!softSurface.ok) {
  console.error("FAIL: soft prod surface after scrub", softSurface);
  process.exit(1);
}

const furnPolished = applyFurnitureExhibitionPackPolish(visitTitlePack, brandIntro);
if (/보러\s*다녀|직접\s*다녀/.test(furnPolished.title || furnPolished.sections?.[0]?.heading || "")) {
  console.error("FAIL: furniture polish forced visit tone for brand_intro", furnPolished.title);
  process.exit(1);
}

console.log("OK: speaker voice lock — label, belief, delivery, sqv, slim payload, surface scrub");
console.log("  brand belief score:", brandBelief.score, "sqv:", sqv.score);
