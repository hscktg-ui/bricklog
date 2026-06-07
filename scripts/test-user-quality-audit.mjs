/**
 * 사용자 관점 품질 감사 — 게이트 불일치·미검 시나리오
 */
import { V4_SPEAKER_OPTIONS } from "../lib/persona/v4Speakers.js";
import {
  buildResearchGroundedHumanPack,
  buildResearchGroundedPlacePack,
  buildResearchGroundedInstagramPack,
} from "../lib/content/researchGroundedHumanPack.js";
import { buildMissionProseFallbackPack } from "../lib/llm/missionProseFallback.js";
import { assessCompletionReadiness } from "../lib/product/completionStandard.js";
import { assessHumanWritingDelivery as assessHuman } from "../lib/product/humanWritingDeliveryGate.js";
import { deliverBlogDespiteGate } from "../lib/product/deliverySoftPass.js";
import { assertPublicTestSampleGate } from "../lib/publicTest/publicTestGate.js";
import { scoreCoreContent } from "../lib/quality/coreQualityEngine.js";
import { scoreBriclogEngine } from "../lib/product/briclogEngineScore.js";
import { collectMergedResearchFacts } from "../lib/product/researchReadiness.js";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { getChannelFullText } from "../lib/content/channelPack.js";
import { DEFAULT_QUALITY_TARGET } from "../lib/quality/qualityDefaults.js";

process.env.BRICLOG_MISSION = "true";

const PET_FACTS = [
  { axis: "brand", fact: "실내 대형견·소형견 구역이 분리되어 있음" },
  { axis: "brand", fact: "견주 음료와 반려견 간식 메뉴가 따로 있음" },
  { axis: "region", fact: "파주 운정·교하 일대 주말 방문객이 많음" },
  { axis: "topic", fact: "예약 없이 당일 입장 가능하나 혼잡 시 대기" },
  { axis: "topic", fact: "주차장이 매장 앞에 10대 규모" },
];

const petBase = {
  brandName: "플레르퍼피",
  region: "파주",
  topic: "애견카페 플레르퍼피 다녀왔어요",
  purposeType: "visit",
  blogLengthTier: "short",
};

const issues = [];

function report(id, detail) {
  issues.push({ id, detail });
  console.error(`ISSUE [${id}]`, detail);
}

function assertGap(name, condition, detail) {
  if (condition) report(name, detail);
}

// ── 1) completion vs humanWriting 불일치 (사용자는 점수만 보고 복사) ──
const researchPack = buildResearchGroundedHumanPack({
  ...petBase,
  v4Speaker: "plain_review",
  researchFacts: PET_FACTS,
});
const completion = assessCompletionReadiness(researchPack, {
  ...petBase,
  researchFacts: PET_FACTS,
});
const human = assessHuman(researchPack, {
  ...petBase,
  researchFacts: PET_FACTS,
});
if (completion.displayReady !== human.displayReady) {
  report(
    "gate_mismatch_completion_human",
    `completion.displayReady=${completion.displayReady} human.displayReady=${human.displayReady} reasons=${human.reasons.join(",")}`
  );
}

// ── 2) UI 품질 점수 95+ 위장 vs 실제 사람글 미달 ──
const fakeHighScore = {
  ...researchPack,
  _meta: {
    ...researchPack._meta,
    qualityScore: { total: 96, pass: true },
    coreQuality: { total: 96, pass: true },
  },
};
const fakeHuman = assessHuman(fakeHighScore, {
  ...petBase,
  researchFacts: PET_FACTS,
});
const uiWouldShowGoal =
  fakeHighScore._meta.qualityScore.total >= DEFAULT_QUALITY_TARGET;
if (uiWouldShowGoal && !fakeHuman.humanReady) {
  report(
    "ui_score_misleads_user",
    `qualityScore ${fakeHighScore._meta.qualityScore.total}≥${DEFAULT_QUALITY_TARGET} but humanReady=false (${fakeHuman.reasons.join(",")})`
  );
}

// ── 3) 조사 팩트가 v2Axis에만 있을 때 completion grounded 스킵 버그 ──
const axisOnlyInput = {
  ...petBase,
  v4Speaker: "plain_review",
  v2Axis: { researchFacts: PET_FACTS },
};
const axisPack = buildResearchGroundedHumanPack({
  ...axisOnlyInput,
  researchFacts: PET_FACTS,
});
const mergedCount = collectMergedResearchFacts(axisOnlyInput).length;
const completionAxis = assessCompletionReadiness(axisPack, axisOnlyInput);
if (
  mergedCount >= 2 &&
  !completionAxis.reasons.includes("grounded_specificity_low") &&
  !completionAxis.displayReady
) {
  /* ok — other reasons */
} else if (mergedCount >= 2 && completionAxis.displayReady) {
  const groundedOnlyInputFacts = { ...petBase, researchFacts: undefined };
  const completionNoFacts = assessCompletionReadiness(
    axisPack,
    groundedOnlyInputFacts
  );
  if (
    completionNoFacts.displayReady &&
    !completionNoFacts.reasons.includes("grounded_specificity_low")
  ) {
    report(
      "completion_ignores_merged_facts",
      "v2Axis.researchFacts only — completionStandard uses input.researchFacts not collectMergedResearchFacts"
    );
  }
}

// ── 4) 화자 매트릭스 — 방문 주제에 정보형 화자 ──
for (const sp of V4_SPEAKER_OPTIONS) {
  const input = {
    ...petBase,
    v4Speaker: sp.value,
    researchFacts: PET_FACTS,
  };
  let pack;
  try {
    pack = buildResearchGroundedHumanPack(input);
  } catch (e) {
    report("speaker_pack_crash", `${sp.label}: ${e.message}`);
    continue;
  }
  const h = assessHuman(pack, input);
  if (sp.value === "expert_info" && h.humanReady) {
    report(
      "visit_expert_info_passes",
      "전문 정보형이 방문 후기에서 humanReady=true — 사용자에게 가이드형 노출 위험"
    );
  }
  if (
    (sp.value === "plain_review" || sp.value === "real_use") &&
    !h.humanReady
  ) {
    report(
      "visit_review_speaker_fails",
      `${sp.label} should pass visit+research but humanReady=false: ${h.reasons.join(",")}`
    );
  }
}

// ── 5) 조사 없이 mission 폴백 — 배달 차단해야 함 ──
const missionOnly = buildMissionProseFallbackPack(petBase);
const missionDeliver = deliverBlogDespiteGate(petBase, missionOnly, {});
if (missionDeliver?.blogContent) {
  report(
    "mission_fallback_delivered",
    "조사·화자 없이 mission 템플릿이 사용자 화면에 배달됨"
  );
}

// ── 6) 공개 테스트 게이트 vs 로그인 경로 ──
const pubGate = assertPublicTestSampleGate(
  { ...petBase, researchFacts: PET_FACTS },
  researchPack
);
const pubGateAxis = assertPublicTestSampleGate(
  { ...petBase, v2Axis: { researchFacts: PET_FACTS } },
  researchPack
);
if (pubGate.ok !== pubGateAxis.ok) {
  report(
    "public_test_fact_source_inconsistent",
    `researchFacts ok=${pubGate.ok} vs v2Axis only ok=${pubGateAxis.ok}`
  );
}

// ── 7) 채널만 생성 — 블로그 human gate 없음, core 점수만 ──
const place = buildResearchGroundedPlacePack({
  ...petBase,
  researchFacts: PET_FACTS,
});
const insta = buildResearchGroundedInstagramPack(
  { ...petBase, researchFacts: PET_FACTS },
  "emotional"
);
const placeCore = scoreCoreContent(
  place,
  { input: { ...petBase, researchFacts: PET_FACTS } },
  "place"
);
const instaCore = scoreCoreContent(
  insta,
  { input: { ...petBase, researchFacts: PET_FACTS } },
  "instagram"
);
const placeText = getChannelFullText(place, "place");
if (/성분·보관|알아보게\s*된\s*이유/.test(placeText)) {
  report("channel_place_template_leak", placeText.slice(0, 200));
}
if (placeCore.total >= DEFAULT_QUALITY_TARGET && placeText.replace(/\s/g, "").length < 200) {
  report(
    "channel_short_high_score",
    `place core=${placeCore.total} but only ${placeText.replace(/\s/g, "").length} chars — 사용자가 고점수 짧은 공지 받음`
  );
}

// ── 8) 엔진 통합 점수 vs humanReady ──
const engine = scoreBriclogEngine(researchPack, {
  input: { ...petBase, researchFacts: PET_FACTS },
});
if (engine.ok && engine.total >= 85 && !human.humanReady) {
  report(
    "engine_score_vs_human",
    `briclogEngine ${engine.total} ok but humanReady=${human.humanReady}`
  );
}

// ── 9) 연구 팩트 1건 — publicTest는 막지만 completion? ──
const thinFacts = { ...petBase, researchFacts: [PET_FACTS[0]] };
const thinPack = buildResearchGroundedHumanPack(thinFacts);
const thinHuman = assessHuman(thinPack, thinFacts);
const thinDeliver = deliverBlogDespiteGate(thinFacts, thinPack, {});
if (thinDeliver?.blogContent && !thinHuman.humanReady) {
  /* blocked — good */
} else if (thinDeliver?.blogContent) {
  report("thin_research_delivered", "팩트 1건인데 배달됨");
}

// ── 10) 정보형 주제 + 후기형 화자 차단 ──
const infoBase = {
  brandName: "모카하우스",
  region: "서울 마포",
  topic: "봄 시즌 브런치 메뉴 종류와 고르는 법",
  purposeType: "info",
  blogLengthTier: "short",
};
const infoWrongSpeaker = buildResearchGroundedHumanPack({
  ...infoBase,
  v4Speaker: "plain_review",
  researchFacts: [
    { axis: "topic", fact: "봄 한정 브런치 메뉴가 4종 운영" },
    { axis: "brand", fact: "수제 소스와 시즌 과일 토핑 사용" },
    { axis: "topic", fact: "주말 11시 오픈 런치 세트 별도" },
  ],
});
const infoWrongHuman = assessHuman(infoWrongSpeaker, {
  ...infoBase,
  v4Speaker: "plain_review",
  researchFacts: infoWrongSpeaker._meta?.researchFacts || [
    { axis: "topic", fact: "봄 한정 브런치 메뉴가 4종 운영" },
    { axis: "brand", fact: "수제 소스와 시즌 과일 토핑 사용" },
  ],
});
if (infoWrongHuman.humanReady) {
  report(
    "info_plain_review_passes",
    "정보형 주제에 담백 후기형이 humanReady=true"
  );
}

// ── 11) 고객 본문·제목 유출 스캔 (_meta 내부 키는 제외) ──
const INTERNAL_RE =
  /gemini|MIN_|insufficient_information|v2axis|beta_test_guard|personaEngineProfile/i;
for (const [label, pack] of [
  ["blog", researchPack],
  ["place", place],
]) {
  const customerText = `${pack.title || ""}\n${getBlogFullText(pack)}`;
  if (INTERNAL_RE.test(customerText)) {
    report("meta_internal_leak", `${label} body: ${customerText.slice(0, 120)}`);
  }
}

if (issues.length === 0) {
  console.log("OK user-quality-audit");
  console.log("  research humanReady:", human.humanReady);
  console.log("  completion displayReady:", completion.displayReady);
  console.log("  engine total:", engine.total);
  console.log("  place core:", placeCore.total);
  console.log("  publicTest ok:", pubGate.ok);
  process.exit(0);
}

console.error("\nFAILED user-quality-audit:", issues.length, "issue(s)");
for (const i of issues) {
  console.error(` - ${i.id}: ${i.detail}`);
}
process.exit(1);
