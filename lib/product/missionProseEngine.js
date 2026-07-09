/**
 * BRICLOG MISSION PROSE ENGINE — 폴백·후처리 SSOT (특정 샘플·브랜드 하드코딩 금지)
 * Human Story · Industry Flavor · Checklist 필터 · Region Lock
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import {
  deriveTopicWritingContext,
  isInformationalTopicInput,
  prefersVisitExperienceTone,
  topicRaw,
  topicWritingFacet,
  topicReaderPhrase,
} from "@/lib/content/topicFacetEngine";
import {
  getIndustryFlavorForInput,
  isExhibitionTopic,
  isFurnitureIndustry,
  resolveBriclogIndustryKey,
} from "@/lib/product/industryContextEngine";
import {
  buildHumanStoryProblemOpening,
  buildHumanStoryProblemOpeningLead,
  ensureHumanStoryOpeningBody,
} from "@/lib/product/humanStoryEngine";
import { CHECKLIST_TEMPLATE_RES } from "@/lib/product/checklistVoiceEngine";
import {
  isEditorHumanizationDeclarativeAdvice,
  isEditorHumanizationForbiddenSentence,
} from "@/lib/product/editorHumanizationEngine";
import {
  isDeepLearningForbidden,
  isVariableSubstitutionFailure,
} from "@/lib/product/deepLearningEngine";
import { applyRegionVoiceLockToPack } from "@/lib/content/regionVoiceLock";
import { applyFurnitureExhibitionPackPolish, isOpimoUnverifiedSentence } from "@/lib/product/furnitureExhibitionEngine";
import { applyHaeyoConsistencyToPack } from "@/lib/content/haeyoConsistencyGate";
import { applyHumanWriterHeadingGate } from "@/lib/content/humanWriterHeadingGate";
import { buildStoryTargetSceneLines } from "@/lib/product/storyTargetEngine";
import { polishNaverBlogVoice } from "@/lib/channel/naverBlogEngineRules";
import { stripMetaLayerTerms } from "@/lib/content/metaLayerSeparation";
import {
  countBlogBodyCharsWithSpaces,
  koreanObjectParticle,
  koreanSubjectParticle,
} from "@/lib/prompts/engine/textUtils";
import { wordOverlapRatio } from "@/lib/content/duplicateKillerEngine";
import { buildTopicAwareConsumerPads } from "@/lib/content/topicAwareLengthPads";
import {
  sanitizeMissionSentence,
  isMissionOutputDefectSentence,
} from "@/lib/product/missionOutputSanitizer";
import {
  allowsFictionalExperience,
  PADDING_PATTERN_RES,
  shouldSuppressLengthTopoff,
} from "@/lib/product/coreContentEngine";
import { isLengthPaddingForbidden } from "@/lib/product/missionFlags";
import { isDisplayBodyForbidden } from "@/lib/content/displayBodyGuards";
import {
  isFlowerRecommendationTopic,
  buildFlowerRecommendationMissionParagraphs,
  buildFlowerRecommendationFieldPad,
  isFlowerStaffVisitTemplate,
} from "@/lib/product/flowerRecommendationProseEngine";
import {
  isFurnitureChairProductTopic,
  buildFurnitureChairProductParagraphs,
  buildFurnitureChairFieldPad,
  isFurnitureEngineDefect,
} from "@/lib/product/furnitureProductProseEngine";
import { isExplainEngineDefect } from "@/lib/product/briclogExplainEngine";
import { isExperienceOpinionDefect } from "@/lib/product/briclogExperienceOpinionEngine";
import { isGpt55WriterDominant } from "@/lib/llm/llmProvider";
import {
  isGpt55LlmPack,
  shouldSkipMissionCatalogConclusion,
} from "@/lib/product/gpt55LlmPackGuard";
import { defaultTopicFacet } from "@/lib/content/topicFacetEngine";
import { resolvePersonaEngineProfile } from "@/lib/persona/personaEngineProfile";
import {
  buildResearchFactLines,
  hasUsableResearchFacts,
  humanizeResearchFact,
} from "@/lib/content/researchGroundedHumanPack";
import { collectMergedResearchFactsFromInput } from "@/lib/product/researchReadiness";
import {
  isBriclogSelfBrandInput,
  isSaasLikeInput,
  resolveWritingContract,
} from "@/lib/content/writingContract";

export const MISSION_PROSE_ENGINE_VERSION = "v1.3";

const VISIT_GUIDE_PAD_RE = /에\s*직접\s*가서\s+.+?\s+관련\s+안내를\s+들었어요/;

const NON_FIELD_VISIT_PAD_RES = [
  /직접\s*다녀(?:왔|온|와)/,
  /보러\s*직접\s*다녀/,
  /직접\s*가(?:서|볼)|한번\s*직접\s*가보려/,
  /현장\s*그래서/,
  /에\s*들어가\s*.+\s*직접\s*봤/,
  /직접\s*가볼\s*일/,
  /에\s*직접\s*가서/,
  /현장\s*.+\s*직접\s*본/,
  /매장\s*문을\s*열고/,
  /들어서니/,
  /진열대에서/,
  /하나씩\s*비교해\s*봤/,
  /손으로\s*확인/,
  /보여\s*주셔서/,
  /안내받(?:았|고)/,
  /상담\s*(?:초반|에서)\s*.+\s*(?:들었|짚었|확인)/,
];

function shouldUseVisitToneInMissionPads(input = {}) {
  return resolveWritingContract(input).visitToneAllowed;
}

function isEssayArchetypeInput(input = {}) {
  return resolvePersonaEngineProfile(input).archetype === "essay";
}

/** essay — 브로슈어형 미션 패드 대신 조사·체험 서술만으로 분량 보강 */
function shouldUseResearchFactOnlyLengthPads(input = {}) {
  return isEssayArchetypeInput(input) && hasUsableResearchFacts(input);
}

const RESEARCH_PAD_META_RE = [
  /현장에서\s*확인한\s*운영\s*포인트/,
  /방문·시즌\s*맥락/,
  /매장\s*체험·행사\s*조건/,
  /이번\s*글의\s*핵심\s*주제/,
  /^등록·운영\s*기준을\s*보면\s*[^.]{0,28}\.\s*$/,
  /^.+?\s*안내\s*기준으로\s*정리해\s*봤어요\.\s*$/,
  /^매장\s*안내\s*기준으로\s*정리해\s*봤어요\.\s*$/,
  /안내에서\s+.+\s*쪽이\s*눈에\s*들어왔어요/,
  /예약\s*전에\s*다시\s*읽어\s*보면\s*도움이\s*돼요/,
  /예약\s*전에\s+.+\s*를\s*다시\s*읽어\s*봤어요/,
];

function isLowYieldResearchPadLine(text = "") {
  const t = String(text || "").trim();
  if (!t || t.replace(/\s/g, "").length < 16) return true;
  return RESEARCH_PAD_META_RE.some((re) => re.test(t));
}

function allowsVisitExperienceDeepen(input = {}) {
  if (!shouldUseVisitToneInMissionPads(input)) return false;
  return allowsFictionalExperience(input) || prefersVisitExperienceTone(input);
}

function moodPairObject(m0, m1) {
  return `${m0}와 ${m1}`;
}

function comparisonSubjectLabel(subject = "") {
  const s = String(subject || "").trim();
  if (!s) return "메뉴";
  if (/구성$/.test(s)) return s;
  if (/안내$/.test(s)) return s.replace(/\s*안내$/, "").trim() || "선택";
  return s;
}

function subjectObject(subject) {
  return koreanObjectParticle(subject || "이용");
}

export function missionProseClean(text, input = {}) {
  const base = polishNaverBlogVoice(stripMetaLayerTerms(String(text || "").trim()))
    .replace(/당일\s+당일/g, "당일")
    .replace(/당일\s+안내\s+으로/g, "당일 안내로");
  return sanitizeMissionSentence(base, input);
}

export function isMissionChecklistPad(text = "") {
  const t = String(text || "").trim();
  if (!t) return false;
  return CHECKLIST_TEMPLATE_RES.some((re) => re.test(t)) || isMissionBrochurePad(t);
}

/** 안내·브로슈어형 미션 패딩 — 경험 칼럼에서 제외 */
export function isMissionBrochurePad(text = "") {
  const t = String(text || "").trim();
  if (!t) return false;
  return MISSION_BROCHURE_PAD_RE.some((re) => re.test(t));
}

const MISSION_BROCHURE_PAD_RE = [
  /확인된\s*범위/,
  /자주\s*문의(?:되)?는\s*조건/,
  /볼\s*때\s*짚을\s*점/,
  /시즌\s*꽃재/,
  /여름철에는\s*시원한\s*톤/,
  /6월이\s*시작되면\s*꽃도/,
  /조금씩\s*달라집니다/,
  /어디에\s*놓을지\s*먼저\s*생각/,
  /중립적으로\s*정리/,
  /선택이\s*수월(?:해|합니다)/,
  /목적별로\s*달라지는\s*기준을\s*먼저\s*정리/,
  /확인\s*가능한\s*범위만/,
  /헷갈리는\s*포인트/,
  /수월했/,
  /비교가\s*수월(?:해|합니다)/,
  /맞추기\s*수월/,
  /안내\s*구성/,
  /구성\s*구성/,
  /확인해\s*확인해/,
  /이용\s*동선/,
  /컬러를에/,
  /\(.*기준\)/,
  /메뉴\s*기준/,
  /이번\s*전시\s*을/,
  /✔/,
  /착와감/,
  /전시\s*소식/,
  /등록·운영\s*기준을\s*보면/,
  /근처\s*매장\s*체험/,
  /매장\s*체험·행사\s*조건/,
  /우선순위가\s*분명해집니다/,
  /쇼룸\s*기준/,
  /구성·옵션을\s*정리(?:했|해)/,
  /시즌·일정에\s*따라\s*달라질\s*수\s*있어\s*확인/,
  /목적에\s*따라\s*우선순위가\s*달라집니다/,
  /안내\s*구성·옵션/,
  /매장\s*커리큘럼/,
];

/** 꽃·식품·펫 전용 — 타 업종 오염 */
export const MISSION_PRODUCT_INFO_PAD_RE = [
  /색감·보관/,
  /성분·보관·선물/,
  /성분·원재료·보관/,
  /알레르기·원재료/,
  /첨가물·알레르기/,
  /선물·반려·집에서\s*먹기/,
  /유통기한·냉장\s*보관/,
  /라벨\s*기준/,
];

export function isMissionProductInfoPad(text = "", input = {}) {
  const t = String(text || "").trim();
  if (!t) return false;
  const key = resolveBriclogIndustryKey(input);
  if (key === "flower" || key === "pet" || key === "snack") return false;
  return MISSION_PRODUCT_INFO_PAD_RE.some((re) => re.test(t));
}

export function filterMissionExperienceParagraphs(paras = [], input = {}) {
  const blockVisit = !shouldUseVisitToneInMissionPads(input);
  return paras.filter((p) => {
    const t = String(p || "").trim();
    if (t.replace(/\s/g, "").length < 12) return false;
    if (blockVisit && NON_FIELD_VISIT_PAD_RES.some((re) => re.test(t))) return false;
    if (isDisplayBodyForbidden(t, input)) return false;
    if (isMissionChecklistPad(t)) return false;
    if (isMissionProductInfoPad(t, input)) return false;
    if (isEditorHumanizationForbiddenSentence(t)) return false;
    if (isEditorHumanizationDeclarativeAdvice(t)) return false;
    if (isDeepLearningForbidden(t)) return false;
    if (isVariableSubstitutionFailure(t)) return false;
    if (isMissionOutputDefectSentence(t, input)) return false;
    if (isFlowerStaffVisitTemplate(t, input)) return false;
    if (isFurnitureEngineDefect(t, input)) return false;
    if (isExplainEngineDefect(t, input)) return false;
    if (isExperienceOpinionDefect(t, input)) return false;
    if (/오피모/i.test(`${input.topic || ""} ${input.mainKeyword || ""}`) && isOpimoUnverifiedSentence(t, input)) {
      return false;
    }
    return true;
  });
}

function buildSaasProductMissionCatalog(p, input = {}, researchLines = []) {
  const brand = String(p.brand || input.brandName || "브랜드").trim();
  return filterMissionExperienceParagraphs(
    [
      buildHumanStoryProblemOpening(input),
      `${brand}는 브랜드·주제·조사 입력부터 이야기·플레이스·인스타 초안까지 한 흐름으로 이어집니다.`,
      `작업실에서는 주제만 적어도 조사·맥락 점검 후 채널별 초안을 받는 구조입니다.`,
      `생성 전에는 이번 글 유형과 넣을 기능·화면 포인트를 먼저 정리하는 편이 좋습니다.`,
      `검수 단계에서는 길이·반복·업종 적합성을 함께 확인합니다.`,
      `운영 계획·발행 준비도는 이번 달·이번 주 콘텐츠 일정과 연결됩니다.`,
      ...researchLines,
    ].map((line) => missionProseClean(line, input)),
    input
  );
}

function flowerGuidePads(p, moodA, moodB) {
  return [
    `여름철에는 밝은 톤·가벼운 수종이 선물용으로 많이 고려됩니다.`,
    `색감·보관은 꽃 종류마다 달라, 받는 분 공간에 맞춰 고르는 편이 좋습니다.`,
    `생일·축하 목적이라면 포장 톤과 카드 문구도 함께 맞추면 전달이 분명해집니다.`,
    `당일 픽업·배송 가능 여부는 시즌·재고에 따라 달라질 수 있습니다.`,
    `${p.brand} 기준으로 시즌별 추천 구성을 정리했습니다.`,
  ];
}

function flowerVisitPads(p, moodA, moodB) {
  return [
    `진열대에서 여름 톤 꽃을 하나씩 비교해 봤어요.`,
    `색감·보관은 매장에서 직접 보면서 비교했어요.`,
    `생일·축하처럼 목적을 말하니 추천 구성이 달라졌어요.`,
    `배송·픽업 시간을 상담 초반에 확인해 두니 일정 맞추기가 수월했어요.`,
    `리본·카드 문구 샘플을 같이 보며 ${moodPairObject(moodA, moodB)}에 맞춰 골랐어요.`,
    `당일 재고와 예약 주문 가능 여부를 따로 안내받았어요.`,
  ];
}

/**
 * 업종 flavor 기반 경험 문단 풀 — 모든 카테고리 공통
 */
function buildInformationalMissionCatalog(p, input = {}, researchLines = []) {
  const visit = shouldUseVisitToneInMissionPads(input);
  const { key, flavor } = getIndustryFlavorForInput(input);
  const facet = topicWritingFacet(input) || p.topicFacet || p.topicRaw || topicReaderPhrase(input, 0);
  const moodA = flavor.moodWords?.[0] || "분위기";
  const moodB = flavor.moodWords?.[1] || "응대";

  const universal = [
    buildHumanStoryProblemOpening(input),
    ...(visit
      ? [
          `요즘 ${facet} 알아보던 중 ${p.regionBit}${p.brand}에 직접 가볼 일이 생겼어요.`,
          `${p.regionBit}${p.brand}에서 ${facet} 관련 안내를 들으며 메모해 뒀어요.`,
        ]
      : [`${p.brand} ${facet} 관련 안내를 공식·매장 기준으로 정리해 봤어요.`]),
    ...researchLines,
  ];

  const byKey = {
    flower: visit ? flowerVisitPads(p, moodA, moodB) : flowerGuidePads(p, moodA, moodB),
    education: [
      `상담실에서 ${facet} 대상 학년·반 편성을 먼저 확인했어요.`,
      `수업 시간표·특강 기간을 메모해 두고 집에서 일정과 맞춰 봤어요.`,
      `커리큘럼 설명을 들으며 본인 목표와 맞는지 질문해 봤어요.`,
      `등록 절차·자료·비용 안내를 항목별로 정리해 달라고 했어요.`,
    ],
    craft: [
      `체험 소요 시간·난이도·인원 제한을 예약 전에 확인했어요.`,
      `완성품 사진과 실제 작업 과정 설명을 함께 들었어요.`,
      `준비물·옷·액세서리 착용 가능 여부를 상담 초반에 물어봤어요.`,
      `예약금·취소 규칙·주차 위치를 메모해 두었어요.`,
    ],
    pension: [
      `객실 타입·뷰·최소 숙박일 조건을 상담에서 확인했어요.`,
      `체크인·체크아웃·바비큐·주차 안내를 항목별로 들었어요.`,
      `비수기 할인 기간·적용 객실을 당일 기준으로 메모했어요.`,
    ],
    restaurant: [
      `점심 특선 구성·가격·제공 시간을 메뉴판과 안내로 확인했어요.`,
      `예약·단체석·웨이팅 가능 시간을 전화로 먼저 확인했어요.`,
      `대표 메뉴와 시즌 메뉴 ${koreanObjectParticle(moodA)} 나눠 봤어요.`,
    ],
    construction: [
      `상담에서 공사 범위·견적 항목·일정을 항목별로 들었어요.`,
      `자재 샘플·시공 사례 사진을 보며 기준을 정리했어요.`,
      `실측·A/S·하자 보수 범위를 질문해 메모해 두었어요.`,
    ],
    salon: [
      `상담에서 두피·모발 상태와 원하는 톤을 먼저 짚었어요.`,
      `시술 순서·소요 시간·관리 방법을 당일 안내로 들었어요.`,
    ],
    cafe: [
      `시즌 메뉴와 기본 메뉴 ${koreanObjectParticle(moodA)} 나눠 보면 선택 기준이 분명해집니다.`,
      `테이크아웃·매장 이용 ${koreanSubjectParticle(moodB)} 메뉴 옆 안내에서 먼저 확인하는 편이 좋습니다.`,
    ],
    pet_cafe: [
      `입장 조건·몸무게·리드줄 안내는 방문 전에 확인해 두는 편이 좋습니다.`,
      `실내 놀이 구역과 사람 좌석 분위기를 나눠 보면 이용 기준이 분명해집니다.`,
    ],
    default: [
      `${facet} 관련 ${moodA}·${moodB} 조건은 목적에 따라 우선순위가 달라집니다.`,
    ],
  };

  return [...universal, ...(byKey[key] || byKey.default)].map((line) =>
    missionProseClean(line, input)
  );
}

export function buildMissionExperienceCatalog(p, input = {}, researchLines = []) {
  const contract = resolveWritingContract(input);

  if (
    (isBriclogSelfBrandInput(input) || isSaasLikeInput(input)) &&
    contract.type === "product_guide"
  ) {
    return buildSaasProductMissionCatalog(p, input, researchLines);
  }

  if (isFlowerRecommendationTopic(input)) {
    return filterMissionExperienceParagraphs(
      buildFlowerRecommendationMissionParagraphs(p, input, researchLines).map((line) =>
        missionProseClean(line, input)
      ),
      input
    );
  }

  if (isFurnitureChairProductTopic(input)) {
    return filterMissionExperienceParagraphs(
      buildFurnitureChairProductParagraphs(p, input, researchLines).map((line) =>
        missionProseClean(line, input)
      ),
      input
    );
  }

  if (!contract.visitToneAllowed && isInformationalTopicInput(input)) {
    return filterMissionExperienceParagraphs(
      buildInformationalMissionCatalog(p, input, researchLines),
      input
    );
  }

  if (isInformationalTopicInput(input)) {
    return filterMissionExperienceParagraphs(
      buildInformationalMissionCatalog(p, input, researchLines),
      input
    );
  }

  const { key, flavor } = getIndustryFlavorForInput(input);
  const facet = topicWritingFacet(input) || p.topicFacet || p.topicRaw || defaultTopicFacet(input);
  const moodA = flavor.moodWords?.[0] || "분위기";
  const moodB = flavor.moodWords?.[1] || "응대";

  if (key === "flower" && shouldUseVisitToneInMissionPads(input)) {
    return filterMissionExperienceParagraphs(
      [
        buildHumanStoryProblemOpening(input),
        `${p.regionBit}그래서 ${p.brand} ${facet} 보러 직접 다녀왔어요.`,
        `매장 문을 열고 들어서니 진열대에 생화 색감이 먼저 보였어요.`,
        `목적을 말하니 추천 구성이 짧게 정리됐어요.`,
        `리본·카드 문구 샘플을 같이 보며 ${moodPairObject(moodA, moodB)}에 맞춰 골랐어요.`,
        `줄기 마감·포장 상태를 손으로 확인해 봤어요.`,
        `당일 픽업과 배송 시간대를 따로 안내받고 일정에 맞춰 메모했어요.`,
        `비슷한 가격대 두 안을 놓고 꽃 종류 차이를 비교했어요.`,
        `진열대에서 시즌 톤 꽃을 하나씩 비교해 봤어요.`,
        `집에 들고 왔을 때 보관 방법만 정리해 두었어요.`,
        ...researchLines,
      ].map((line) => missionProseClean(line, input)),
      input
    );
  }

  if (!shouldUseVisitToneInMissionPads(input)) {
    return filterMissionExperienceParagraphs(
      buildInformationalMissionCatalog(p, input, researchLines),
      input
    );
  }

  return filterMissionExperienceParagraphs(
    [
      buildHumanStoryProblemOpening(input),
      `${p.regionBit}그래서 ${p.brand} ${facet} 보러 직접 다녀왔어요.`,
      `${p.regionBit}${p.brand}에 들어가 ${facet}를 직접 봤어요.`,
      `현장에서 ${moodPairObject(moodA, moodB)} 쪽을 하나씩 비교해 봤어요.`,
      `두 가지 안을 놓고 보니 ${facet} 고를 때 기준이 조금씩 달랐어요.`,
      `견적·조건은 당일 기준으로 메모해 두고 집에서 다시 비교했어요.`,
      `주말·피크 시간대는 대기가 있을 수 있어 평일 오전에 갔어요.`,
      ...researchLines,
    ].map((line) => missionProseClean(line, input)),
    input
  );
}

/**
 * 업종별 현장형 보강 문단 (체크리스트 패턴 제외)
 */
function informationalSubjectLabel(subject = "", input = {}) {
  const s = String(subject || "").trim();
  if (isFurnitureIndustry(input) && /라인업|전시|신제품|오픈/.test(s)) return "전시·모델";
  if (resolveBriclogIndustryKey(input) === "flower" || /꽃|플라워|bouquet/i.test(s)) {
    return s.length > 14 ? "꽃·포장" : s || "꽃 선물";
  }
  if (s === "이용" || s.length > 12) return topicReaderPhrase(input, 0);
  return s;
}

function buildInformationalFieldPads(key, flavor, p, input = {}) {
  const visit = shouldUseVisitToneInMissionPads(input);
  const rawSubject = topicRaw(input) || p.topicRaw || p.topicFacet || topicReaderPhrase(input, 0);
  const subject = informationalSubjectLabel(rawSubject, input);
  const m0 = flavor.moodWords?.[0] || "분위기";
  const m1 = flavor.moodWords?.[1] || "응대";
  const universal = visit
    ? [
        `${p.regionBit}${p.brand} ${flavor.spaceWord}에 들어가니 ${flavor.productWord} 안내를 먼저 들었어요.`,
        `처음엔 ${subjectObject(subject)} 고를 때 ${m0}만 보다가, 매장에서 보니 기준이 달라졌어요.`,
      ]
    : [
        `${p.brand} ${subject} 관련 안내를 공식·매장 기준으로 정리했습니다.`,
        `${subject} 선택 시 ${m0}·${m1} 조건을 항목별로 비교하면 기준이 분명해집니다.`,
      ];
  const byKey = {
    flower: visit
      ? [
          `시즌 생화 톤과 포장 스타일을 먼저 보여 주셔서 맞추기 수월했어요.`,
          `줄기·리본 마감을 직접 보며 당일 픽업·배송 가능 여부를 확인했어요.`,
          `꽃 종류별 ${m0} 차이를 진열대에서 하나씩 비교해 봤어요.`,
        ]
      : flowerGuidePads(p, m0, m1).slice(0, 3),
    default: [
      `${subject} 관련 ${m0}·${m1} 조건은 확인 가능한 범위에서만 안내합니다.`,
      `시즌·재고·행사 조건은 날짜에 따라 달라질 수 있어 매장 확인이 필요합니다.`,
      `${p.regionBit || ""}${p.brand} 안내는 공식 채널·매장 기준으로 정리했습니다.`,
    ],
    education: [
      `특강 대상 학년·반 편성·수업 시간은 상담 기준으로 확인했습니다.`,
      `등록 절차·자료·비용 안내는 시기에 따라 달라질 수 있습니다.`,
      `커리큘럼·내신·방학 일정은 매장 상담으로 다시 확인하는 편이 정확합니다.`,
    ],
    craft: [
      `체험 소요 시간·난이도·인원 제한은 클래스마다 다릅니다.`,
      `예약금·취소·준비물 안내는 예약 전에 확인하는 편이 좋습니다.`,
      `완성품 수령·포장 방법은 당일 안내를 기준으로 메모해 두었습니다.`,
    ],
    pension: [
      `객실 타입·최소 숙박일·할인 기간은 시즌마다 달라질 수 있습니다.`,
      `체크인·바비큐·주차 안내는 예약 전에 확인하는 편이 좋습니다.`,
    ],
    restaurant: [
      `점심 특선·코스 구성은 요일·시간대에 따라 달라질 수 있습니다.`,
      `예약·단체석·웨이팅 안내는 방문 전에 확인하는 편이 좋습니다.`,
    ],
    construction: [
      `견적·공사 범위·일정은 현장·자재 조건에 따라 달라질 수 있습니다.`,
      `A/S·하자 보수 범위는 계약 전에 문서로 확인하는 편이 좋습니다.`,
    ],
    salon: [
      `시술 전 두피·모발 상태와 원하는 톤을 상담에서 먼저 짚었습니다.`,
      `시술 후 관리 방법은 당일 안내를 기준으로 메모해 두었습니다.`,
    ],
  };
  return filterMissionExperienceParagraphs(
    [...universal, ...(byKey[key] || byKey.default)].map((line) => missionProseClean(line, input)),
    input
  );
}

function buildIndustryFieldPads(key, flavor, p, input = {}) {
  if (isFlowerRecommendationTopic(input)) {
    return Array.from({ length: 8 }, (_, i) =>
      missionProseClean(buildFlowerRecommendationFieldPad(p, input, i), input)
    ).filter(Boolean);
  }

  if (isFurnitureChairProductTopic(input)) {
    return Array.from({ length: 8 }, (_, i) =>
      missionProseClean(buildFurnitureChairFieldPad(p, input, i), input)
    ).filter(Boolean);
  }

  if (isInformationalTopicInput(input)) {
    return buildInformationalFieldPads(key, flavor, p, input);
  }

  const subject = comparisonSubjectLabel(
    topicRaw(input) || p.topicRaw || topicWritingFacet(input) || defaultTopicFacet(input)
  );
  const m0 = flavor.moodWords?.[0] || "분위기";
  const m1 = flavor.moodWords?.[1] || "응대";
  const m2 = flavor.moodWords?.[2] || "조건";
  const universal = shouldUseVisitToneInMissionPads(input)
    ? [
        `${p.regionBit}${p.brand} ${flavor.spaceWord}에 들어가 ${subject}을 하나씩 비교해 봤어요.`,
        `처음엔 ${subjectObject(subject)} ${flavor.visitReason} 기준만 보다가, ${flavor.spaceWord}에서 보니 감이 왔어요.`,
        `두 번째로 비교해 보니 ${moodPairObject(m0, m1)} 차이가 눈에 들어왔어요.`,
        `상담 때 궁금했던 점을 짧게 메모해 가니 질문이 빠르게 정리됐어요.`,
        `당일 들은 조건은 사진으로 남겨 두고 집에서 다시 검토했어요.`,
        `체험·시연 후 바로 결정하지 않고 하루 두고 메모를 다시 읽어 봤어요.`,
        `동행 인원·목적을 상담 초반에 말해 두니 추천이 빨라졌어요.`,
        `돌아오는 길에 일정·예산을 맞춰 볼지 집에서 메모를 다시 읽어 봤어요.`,
        `직원분이 ${m2} 쪽을 먼저 짚어 주셔서 ${flavor.visitReason}에 맞는지 판단하기 수월했어요.`,
        `${p.regionBit}${p.brand} ${flavor.spaceWord} 동선을 한 바퀴 돌며 ${flavor.productWord}부터 확인했어요.`,
      ]
    : [
        `${p.regionBit}${p.brand} ${subject} — ${flavor.spaceWord}에서 ${flavor.productWord} 안내를 직접 들었어요.`,
        `처음엔 ${subjectObject(subject)} 고를 때 ${flavor.visitReason} 기준만 보다가, ${flavor.spaceWord}에서 보니 감이 왔어요.`,
        `두 번째로 비교해 보니 ${moodPairObject(m0, m1)} 차이가 눈에 들어왔어요.`,
        `상담 때 궁금했던 점을 짧게 메모해 가니 질문이 빠르게 정리됐어요.`,
        `당일 들은 조건은 사진으로 남겨 두고 집에서 다시 검토했어요.`,
        `체험·시연 후 바로 결정하지 않고 하루 두고 메모를 다시 읽어 봤어요.`,
        `동행 인원·목적을 상담 초반에 말해 두니 추천이 빨라졌어요.`,
        `돌아오는 길에 일정·예산을 맞춰 볼지 집에서 메모를 다시 읽어 봤어요.`,
        `직원분이 ${m2} 쪽을 먼저 짚어 주셔서 ${flavor.visitReason}에 맞는지 판단하기 수월했어요.`,
        `${p.regionBit}${p.brand} ${flavor.spaceWord} 동선을 한 바퀴 돌며 ${flavor.productWord}부터 확인했어요.`,
      ];

  const byKey = {
    salon: [
      `상담부터 ${m0}·${m1} 순서를 들었어요.`,
      `두피·모발 상태를 보며 ${subject} 전에 무엇을 먼저 할지 짚어 주셨어요.`,
      `원하는 톤 사진을 보여 드리니 ${m2}·손상을 먼저 상의해 주셨어요.`,
      `시술 후 ${m0}가 어떻게 달라졌는지 거울로 직접 확인했어요.`,
      `염색 전 두피 상태를 보며 ${m2}를 먼저 짚어 주셔서 순서가 명확해졌어요.`,
      `원하는 색감과 ${m1}을 맞추려면 몇 가지 옵션을 비교해야 한다고 들었어요.`,
      `시술실 ${m0}와 대기 공간이 달라서 편한 쪽 자리를 먼저 확인했어요.`,
      `사전 상담에서 ${subject} 일정·소요 시간을 들었어요.`,
      `시술 중간에 ${m2} 관련 안내를 다시 들어 메모해 두었어요.`,
      `마무리 후 관리 방법을 짧게 들었고, 집에서 지킬 포인트만 적어 두었어요.`,
      `${p.regionBit}에서 ${subjectObject(subject)} 후보를 좁히려면 ${moodPairObject(m0, m1)} 직접 보는 게 도움이 됐어요.`,
      `다른 매장과 달리 ${p.brand}는 ${flavor.productWord} 설명이 구체적이어서 비교가 수월했어요.`,
    ],
    flower: [
      `시즌 ${m2}와 포장 스타일을 먼저 보여 주셔서 톤을 맞추기 수월했어요.`,
      `줄기·리본 마감을 직접 보며 당일 픽업·배송 가능 여부를 확인했어요.`,
      `생일·축하·사과처럼 목적마다 추천 구성이 달라 상담이 길어지지 않았어요.`,
      `꽃 종류별 ${m0} 차이를 진열대에서 하나씩 비교해 봤어요.`,
      `배송·픽업 시간대를 상담 초반에 확인해 두니 일정 맞추기가 쉬웠어요.`,
      `포장 샘플을 여러 개 보여 주셔서 ${m1}에 맞는 스타일을 골랐어요.`,
      `당일 재고와 예약 주문 가능 여부를 따로 안내받았어요.`,
      `리본·카드 문구 옵션도 같이 봤어요.`,
    ],
    cafe: [
      `${m0}·${m1}이 편한 자리부터 둘러봤어요.`,
      `메뉴판에서 ${flavor.productWord} 옵션을 하나씩 비교해 봤어요.`,
      `혼잡한 시간대를 피하니 ${m0} 차이를 천천히 볼 수 있었어요.`,
      `테이크아웃·매장 이용 안내는 메뉴 옆 표기에서 확인했어요.`,
      `시즌 메뉴와 기본 메뉴 ${koreanObjectParticle(m0)} 나눠서 봤어요.`,
      `주문 후 나오는 시간·${m1} 안내를 직원분에게 들었어요.`,
      `좌석·콘센트·조명 ${koreanObjectParticle(m0)} 구역별로 비교해 봤어요.`,
    ],
    pet_cafe: [
      `입장 조건·몸무게·리드줄 안내를 먼저 확인했어요.`,
      `실내 놀이 구역과 사람 좌석 분위기를 나눠 봤어요.`,
      `반려견 메뉴·사람 음료 메뉴를 각각 비교해 봤어요.`,
      `혼잡한 시간대에는 대기·좌석 배치가 달라질 수 있어 평일 오전이 한산했다고 들었어요.`,
      `${m0}·${m1} 차이를 구역별로 비교해 봤어요.`,
    ],
    pet: [
      `진열대 ${flavor.productWord} 크기·향을 하나씩 비교해 봤어요.`,
      `성분·급여 방식 차이를 매장에서 짧게 설명해 들었어요.`,
      `반려견 취향에 맞는 ${m0}인지가 제 기준이었어요.`,
      `유통기한·보관 방법을 라벨과 안내로 함께 확인했어요.`,
      `샘플·소분 판매 여부를 상담 때 물어봤어요.`,
      `${m2}별 추천 제품이 달라서 목적을 먼저 말했어요.`,
    ],
    hospital: [
      `접수·대기 흐름을 먼저 확인하고 ${m1} 순서를 들었어요.`,
      `${subject} 관련 ${m2}는 당일 안내를 기준으로 메모해 두었어요.`,
      `예약·당일 접수 ${m0} 차이를 안내판에서 확인했어요.`,
      `상담 전 준비물·소요 시간을 짧게 들었어요.`,
    ],
    marketing: [
      `상담 초반에 목표·채널·예산 범위를 말해 두니 제안 방향이 빨리 잡혔어요.`,
      `기존 운영 사례·보고 주기를 보며 ${flavor.visitReason}에 맞는지 질문해 봤어요.`,
      `제안 받은 일정·소통 채널·담당 체계를 메모해 두고 집에서 다시 검토했어요.`,
      `다른 업체와 달리 ${p.brand}는 ${flavor.productWord} 설명이 구체적이어서 비교가 수월했어요.`,
      `${m0}·${m1} 흐름을 상담 중에 직접 확인했어요.`,
    ],
    education: [
      `상담실에서 대상 학년·반 편성·특강 기간을 먼저 확인했어요.`,
      `수업 시간표·커리큘럼 설명을 들으며 본인 목표와 맞는지 질문해 봤어요.`,
      `등록 절차·자료·비용 안내를 항목별로 메모해 두었어요.`,
      `방학 일정과 기존 학원 시간이 겹치는지 상담에서 짚어 봤어요.`,
    ],
    craft: [
      `체험 소요 시간·난이도·인원 제한을 예약 전에 확인했어요.`,
      `완성품 사진과 작업 과정 설명을 함께 들었어요.`,
      `준비물·옷·액세서리 착용 가능 여부를 상담 초반에 물어봤어요.`,
      `예약금·취소 규칙·주차 위치를 메모해 두었어요.`,
    ],
    pension: [
      `객실 타입·뷰·최소 숙박일 조건을 상담에서 확인했어요.`,
      `체크인·바비큐·주차 안내를 항목별로 들었어요.`,
      `비수기 할인 기간·적용 객실을 당일 기준으로 메모했어요.`,
    ],
    restaurant: [
      `점심 특선 구성·가격·제공 시간을 메뉴판과 안내로 확인했어요.`,
      `예약·단체석·웨이팅 가능 시간을 전화로 먼저 확인했어요.`,
      `대표 메뉴와 시즌 메뉴 ${koreanObjectParticle(m0)} 나눠 봤어요.`,
    ],
    construction: [
      `상담에서 공사 범위·견적 항목·일정을 항목별로 들었어요.`,
      `자재 샘플·시공 사례 사진을 보며 기준을 정리했어요.`,
      `실측·A/S·하자 보수 범위를 질문해 메모해 두었어요.`,
    ],
    default: [
      `${subjectObject(subject)} 볼 때 ${moodPairObject(m0, m1)} 현장에서 직접 비교했어요.`,
      `${flavor.spaceWord} 안내를 들으며 ${flavor.visitReason}에 맞는지 확인했어요.`,
      `${m2} 관련 설명은 당일 기준으로 메모해 두었어요.`,
    ],
  };

  let extra = byKey[key] || byKey.default || [];

  if (isFurnitureIndustry(input)) {
    const exhibition = isExhibitionTopic(input);
    const opimo = /오피모/i.test(`${input.topic || ""} ${input.mainKeyword || ""}`);
    const exhibitBit = opimo ? "오피모" : p.topicFacet;
    if (opimo && exhibition) {
      const scenes = buildStoryTargetSceneLines(input, 4);
      extra = [
        ...scenes,
        `체험 가능한 프레임·매트리스 조합이 전시대마다 달라 라인업부터 확인했어요.`,
        `${exhibitBit} 전시 기간·대상 라인업은 매장 안내로 확인했고, 재고·체험 가능 여부는 당일 다시 물어봤어요.`,
        `쇼룸 동선부터 누워볼 수 있는 구역까지 천천히 돌아봤어요.`,
        `혼자만 체험하면 놓치기 쉬운 포인트라 같이 가는 편이 좋았어요.`,
        `배송 당일 바닥 보호·조립 시간·잔여 포장 처리까지 매장 안내 사항을 메모해 두었어요.`,
      ];
    } else {
      extra = [
        `10분 넘게 누워보니 허리 지지감과 뒤척임 때 소음·진동 전달이 꽤 달랐어요.`,
        `프레임·헤드보드 옵션은 방 동선과 맞는지 실물 배치를 보면서 비교했어요.`,
        exhibition
          ? `${exhibitBit} 전시 기간·대상 라인업은 매장 안내로 확인했고, 재고·체험 가능 여부는 당일 다시 물어봤어요.`
          : `${p.brand} ${subject}는 매장·행사에 따라 체험 가능 모델이 달라 사전 확인이 필요했어요.`,
        `견적 비교 시 본체·프레임·매트리스·설치·회수를 항목별로 나눠 받아 봤어요.`,
        `체험존에서 누워본 순서를 바꿔 보니 첫인상과 두 번째 느낌이 달랐어요.`,
        `배송 당일 바닥 보호·조립 시간·잔여 포장 처리까지 매장 안내 사항을 메모해 두었어요.`,
        `침실 통로·옷장 문 개폭과 프레임 모서리 간섭 여부를 실측하고 상담에 전달했어요.`,
        `체험 매트리스와 전시용 프레임 조합이 실제 주문 구성과 같은지 먼저 확인했어요.`,
      ];
    }
  }

  return filterMissionExperienceParagraphs(
    [...universal, ...extra].map((line) => missionProseClean(line, input)),
    input
  );
}

/** deepen 전용 — 경험 카탈로그와 합쳐 중복 제거한 보강 풀 */
export function buildMissionDeepenPadPool(p, input = {}) {
  const { key, flavor } = getIndustryFlavorForInput(input);
  const field = buildIndustryFieldPads(key, flavor, p, input);
  const experience = allowsVisitExperienceDeepen(input)
    ? buildMissionExperienceCatalog(p, input, [])
    : [];
  const seen = new Set();
  const pool = [];
  for (const para of [...field, ...experience]) {
    const keyPad = paragraphKey(para);
    if (!keyPad || seen.has(keyPad)) continue;
    seen.add(keyPad);
    pool.push(para);
  }
  return pool;
}

function buildConsumerTopicLengthPads(p, input = {}, count = 20) {
  return buildTopicAwareConsumerPads({ ...input, brandName: input.brandName || p.brand }, 0, count).map(
    (line) => missionProseClean(line, input)
  );
}

function buildResearchFactOnlyLengthPadPool(p, input = {}, researchLines = []) {
  const profile = resolvePersonaEngineProfile(input);
  const facet = topicWritingFacet(input) || p.topicFacet || topicReaderPhrase(input, 0);
  const baseLines =
    researchLines?.length > 0 ? researchLines : buildResearchFactLines(input, 18);
  const facts = collectMergedResearchFactsFromInput(input);
  const pool = [];
  const seen = new Set();
  const push = (para) => {
    const cleaned = missionProseClean(String(para || ""), input);
    if (!cleaned || isMissionBrochurePad(cleaned) || isLowYieldResearchPadLine(cleaned)) return;
    const key = paragraphKey(cleaned);
    if (!key || seen.has(key)) return;
    seen.add(key);
    pool.push(cleaned);
  };

  if (isEssayArchetypeInput(input)) {
    for (const line of baseLines.slice(0, 12)) push(line);
    const { key } = getIndustryFlavorForInput(input);
    const craftEssayPads = [
      `체험 소요 시간·난이도·인원 제한을 예약 전에 확인했어요.`,
      `완성품 사진과 실제 작업 과정 설명을 함께 들었어요.`,
      `준비물·옷·액세서리 착용 가능 여부를 상담 초반에 물어봤어요.`,
      `예약금·취소 규칙·주차 위치를 메모해 두었어요.`,
    ];
    if (key === "craft" || key === "default") {
      for (const line of craftEssayPads) push(line);
    }
    const essayBridges = [
      `${p.brand} ${facet} 이야기를 메모해 두며 하나씩 풀어 봤어요.`,
      `손에 잡히는 디테일부터 적어 두는 편이에요.`,
      `작업 과정·소요 시간이 궁금해 안내를 다시 읽어 봤어요.`,
    ];
    for (const line of essayBridges) push(line);
    return pool;
  }

  for (const line of baseLines) push(line);

  for (let slot = 0; slot < facts.length; slot += 1) {
    push(humanizeResearchFact(facts[slot], p, input, slot, profile));
  }

  return pool;
}

function buildResearchFactDynamicDeepenPad(p, input, seq) {
  const craftPads = [
    `체험 소요 시간·난이도·인원 제한을 예약 전에 확인했어요.`,
    `완성품 사진과 실제 작업 과정 설명을 함께 들었어요.`,
    `준비물·옷·액세서리 착용 가능 여부를 상담 초반에 물어봤어요.`,
    `예약금·취소 규칙·주차 위치를 메모해 두었어요.`,
    `작업 과정·소요 시간이 궁금해 안내를 다시 읽어 봤어요.`,
    `손에 잡히는 디테일부터 적어 두는 편이에요.`,
  ];
  if (isEssayArchetypeInput(input)) {
    return missionProseClean(craftPads[seq % craftPads.length], input);
  }
  const profile = resolvePersonaEngineProfile(input);
  const facts = collectMergedResearchFactsFromInput(input);
  if (facts.length) {
    const line = humanizeResearchFact(facts[seq % facts.length], p, input, seq + 8, profile);
    return missionProseClean(line, input);
  }
  const lines = buildResearchFactLines(input, 12);
  if (lines.length) return missionProseClean(lines[seq % lines.length], input);
  return "";
}

/** density-first — 허구 방문 없이 조사·업종 중립 문장으로 분량 보강 */
export function buildDensityFirstLengthPadPool(p, input = {}, researchLines = []) {
  const seen = new Set();
  const pool = [];
  const push = (para) => {
    const key = paragraphKey(para);
    if (!key || seen.has(key)) return;
    seen.add(key);
    pool.push(para);
  };
  if (
    isInformationalTopicInput(input) ||
    !shouldUseVisitToneInMissionPads(input) ||
    (!allowsFictionalExperience(input) && !prefersVisitExperienceTone(input))
  ) {
    if (shouldUseResearchFactOnlyLengthPads(input)) {
      for (const para of buildResearchFactOnlyLengthPadPool(p, input, researchLines)) {
        push(para);
      }
      return pool;
    }
    for (const para of filterMissionExperienceParagraphs(
      buildInformationalMissionCatalog(p, input, researchLines),
      input
    )) {
      push(para);
    }
    if (!isLengthPaddingForbidden()) {
      for (const para of buildConsumerTopicLengthPads(p, input, 24)) {
        push(para);
      }
    }
    return pool;
  }
  for (const para of buildMissionDeepenPadPool(p, input)) {
    push(para);
  }
  return pool;
}

/**
 * density-first tier refill — finalizeMissionProsePack 우회
 */
export function deepenDensityFirstPack(pack, minChars, input = {}, options = {}) {
  const mode = String(pack?._meta?.generationMode || "");
  if (isGpt55WriterDominant() && isGpt55LlmPack(pack, { mode })) return pack;
  const {
    polishAfter = false,
    countChars = countBlogBodyCharsWithSpaces,
    seedOffset = 0,
    researchLines = [],
  } = options;
  if (!pack?.sections?.length) return pack;
  const p = deriveTopicWritingContext(input);
  const { flavor } = getIndustryFlavorForInput(input);
  let next = pack;
  const pads = buildDensityFirstLengthPadPool(p, input, researchLines);
  const usedKeys = collectUsedParagraphKeys(next);
  let existingParas = collectPackParagraphs(next);
  let padCursor = 0;
  let guard = Math.max(0, Number(seedOffset) || 0);
  let dynamicSeq = Math.max(0, Number(seedOffset) || 0);
  const maxGuard = Math.max(pads.length * 8, 160);

  while (countChars(next) < minChars && guard < maxGuard) {
    const secIdx = guard % next.sections.length;
    let para = null;

    for (let i = 0; i < pads.length; i += 1) {
      const candidate = pads[(padCursor + i) % pads.length];
      const key = paragraphKey(candidate);
      if (!usedKeys.has(key) && !isNearDuplicateParagraph(candidate, existingParas)) {
        para = candidate;
        padCursor = (padCursor + i + 1) % pads.length;
        usedKeys.add(key);
        break;
      }
    }

    if (!para) {
      for (let attempt = 0; attempt < 16; attempt += 1) {
        const dynamic = buildDynamicDeepenPad(p, flavor, input, dynamicSeq);
        dynamicSeq += 1;
        const dKey = paragraphKey(dynamic);
        if (
          dynamic &&
          !usedKeys.has(dKey) &&
          !isNearDuplicateParagraph(dynamic, existingParas)
        ) {
          para = dynamic;
          usedKeys.add(dKey);
          break;
        }
      }
    }
    if (!para) break;
    if (
      PADDING_PATTERN_RES.some((re) => re.test(para)) ||
      isMissionBrochurePad(para) ||
      isLowYieldResearchPadLine(para)
    ) {
      guard += 1;
      continue;
    }

    const sections = [...next.sections];
    sections[secIdx] = {
      ...sections[secIdx],
      body: `${sections[secIdx].body}\n\n${para}`.trim(),
    };
    next = { ...next, sections };
    existingParas.push(para);
    guard += 1;
  }

  if (polishAfter) return polishMissionProsePack(next, input);
  return next;
}

function buildInformationalDeepenPads(p, flavor, input, seq) {
  const subject = topicRaw(input) || p.topicRaw || p.topicFacet || "이용";
  const { key } = getIndustryFlavorForInput(input);
  const m0 = flavor.moodWords?.[seq % 3] || "분위기";
  const m1 = flavor.moodWords?.[(seq + 1) % 3] || "응대";
  const byKey = {
    flower: [
      `${subjectObject(subject)} 고를 때 ${m0}·${m1}·선물 목적을 함께 보면 비교가 수월합니다.`,
      `알레르기·원재료 표기는 ${subject} 선택 시 먼저 확인하는 편이 좋습니다.`,
      `색감·보관은 매장에서 직접 보면서 비교했어요.`,
    ],
    pet: [
      `${subjectObject(subject)} 고를 때 ${m0}·${m1}·급여 목적을 함께 보면 비교가 수월합니다.`,
      `성분·알레르기 표기는 ${subject} 선택 시 먼저 확인하는 편이 좋습니다.`,
    ],
    education: [
      `${subjectObject(subject)} 알아볼 때 대상 학년·반 편성·수업 시간을 함께 보면 비교가 수월합니다.`,
      `${p.brand} 특강·등록 안내는 시기에 따라 달라질 수 있어 상담 확인이 필요합니다.`,
      `커리큘럼·내신 범위·방학 일정은 상담실 안내를 기준으로 메모해 두었습니다.`,
    ],
    craft: [
      `${subjectObject(subject)} 예약 전 소요 시간·난이도·인원 제한을 함께 확인하는 편이 좋습니다.`,
      `${p.brand} 체험·준비물 안내는 클래스마다 달라질 수 있습니다.`,
      `완성품 수령·취소 규정은 예약 전에 확인하는 편이 정확합니다.`,
    ],
    pension: [
      `${subjectObject(subject)} 예약 전 객실 타입·최소 숙박일·할인 기간을 함께 보면 비교가 수월합니다.`,
      `${p.brand} 체크인·바비큐·주차 안내는 시즌에 따라 달라질 수 있습니다.`,
    ],
    restaurant: [
      `${subjectObject(subject)} 방문 전 메뉴 구성·예약·웨이팅 시간을 함께 확인하는 편이 좋습니다.`,
      `${p.brand} 점심·코스 안내는 요일·시간대에 따라 달라질 수 있습니다.`,
    ],
    construction: [
      `${subjectObject(subject)} 상담 전 공사 범위·견적 항목·일정을 함께 정리해 두면 비교가 수월합니다.`,
      `${p.brand} 자재·시공 안내는 현장 조건에 따라 달라질 수 있습니다.`,
    ],
    salon: [
      `${subjectObject(subject)} 상담 전 두피·모발 상태와 원하는 톤을 함께 준비해 가면 수월합니다.`,
      `${p.brand} 시술·관리 안내는 당일 두피 상태에 따라 달라질 수 있습니다.`,
    ],
    default: [
      `${subjectObject(subject)} 고를 때 ${m0}·${m1}·이용 목적을 함께 보면 비교가 수월합니다.`,
      `${p.brand}에서 안내하는 ${subject} 관련 조건은 시즌·일정에 따라 달라질 수 있습니다.`,
    ],
  };
  const pool = byKey[key] || byKey.default;
  return missionProseClean(pool[seq % pool.length], input);
}

function buildServiceDeepenPads(p, flavor, input, seq) {
  const subject = topicRaw(input) || p.topicRaw || p.topicFacet || "이용";
  const facet = topicWritingFacet(input) || p.topicFacet || subject;
  const { key } = getIndustryFlavorForInput(input);
  const m0 = flavor.moodWords?.[seq % 3] || "분위기";
  const m1 = flavor.moodWords?.[(seq + 1) % 3] || "응대";
  const universal = [
    `${p.brand} ${facet} 관련 안내는 시즌·일정에 따라 달라질 수 있어 확인이 필요합니다.`,
    `${p.brand} 기준으로 ${facet} 구성·옵션을 정리했습니다.`,
    `${facet} 비교 시 ${m0}와 ${m1}을 나눠 보면 우선순위가 분명해집니다.`,
  ];
  const byKey = {
    cafe: [
      `시즌 메뉴와 기본 메뉴 ${koreanObjectParticle(m0)} 나눠 보면 선택 기준이 분명해집니다.`,
      `테이크아웃·매장 이용 ${koreanSubjectParticle(m1)} 메뉴 옆 안내에서 먼저 확인하는 편이 좋습니다.`,
      `브런치·디저트 옵션은 요일·시간대에 따라 달라질 수 있습니다.`,
    ],
    flower: [
      `시즌 ${m0}와 포장 스타일을 함께 보면 톤 맞추기가 수월합니다.`,
      `배송·픽업 시간대는 날짜와 재고에 따라 달라질 수 있습니다.`,
    ],
    default: [`${facet} 관련 ${m0}·${m1} 조건은 목적에 따라 우선순위가 달라집니다.`],
  };
  const pool = [...universal, ...(byKey[key] || byKey.default)];
  return missionProseClean(pool[seq % pool.length], input);
}

function buildDynamicDeepenPad(p, flavor, input, seq) {
  const subject = topicRaw(input) || p.topicRaw || p.topicFacet || "이용";
  if (shouldUseResearchFactOnlyLengthPads(input)) {
    return buildResearchFactDynamicDeepenPad(p, input, seq);
  }
  if (isInformationalTopicInput(input)) {
    return buildInformationalDeepenPads(p, flavor, input, seq);
  }
  if (!allowsVisitExperienceDeepen(input)) {
    return buildServiceDeepenPads(p, flavor, input, seq);
  }
  const storyScenes = buildStoryTargetSceneLines(input, 6);
  if (storyScenes[seq % storyScenes.length]) {
    return missionProseClean(storyScenes[seq % storyScenes.length], input);
  }
  const m0 = flavor.moodWords?.[seq % 3] || "분위기";
  const m1 = flavor.moodWords?.[(seq + 1) % 3] || "응대";
  const m2 = m2Placeholder(flavor, seq);
  const templates = [
    `${p.brand} ${flavor.spaceWord}에서 ${subjectObject(subject)} 볼 때 ${moodPairObject(m0, m1)} ${seq + 1}번째로 다시 확인했어요.`,
    `상담 중 ${flavor.productWord} 관련 설명을 들으며 ${flavor.visitReason}에 맞는지 짚어 봤어요.`,
    `${flavor.spaceWord}에서 ${m0} 차이를 비교하며 ${subject} 기준을 조금씩 좁혀 갔어요.`,
    `당일 ${m1} 안내를 메모해 두고 ${subject} 후보를 다시 정리해 봤어요.`,
    `${p.brand} ${flavor.spaceWord} — ${m0}와 ${koreanObjectParticle(m2)} 쪽을 현장에서 직접 봤어요.`,
    `${p.brand} 상담 ${seq + 2}번째로 ${m2} 관련 설명을 들으며 메모를 보강했어요.`,
    `${flavor.visitReason}에 맞는지 보려고 ${flavor.spaceWord}에서 ${m0} 포인트를 ${seq + 3}번째로 다시 확인했어요.`,
    `돌아보니 ${m1} 안내와 ${m2} 조건을 나눠 적어 두는 편이 비교에 도움이 됐어요.`,
  ];
  return missionProseClean(templates[seq % templates.length], input);
}

function m2Placeholder(flavor, seq) {
  return flavor.moodWords?.[(seq + 2) % 3] || "조건";
}

/**
 * 글자수 보강용 — 체크리스트 패턴 없는 현장형 문장만
 */
export function buildMissionFieldLengthPads(p, input = {}) {
  const { key, flavor } = getIndustryFlavorForInput(input);
  return buildIndustryFieldPads(key, flavor, p, input);
}

function paragraphKey(text) {
  return String(text || "")
    .replace(/\s/g, "")
    .slice(0, 56);
}

function collectPackParagraphs(pack) {
  const paras = [];
  for (const sec of pack.sections || []) {
    for (const para of String(sec.body || "").split(/\n\n+/)) {
      const t = para.trim();
      if (t.replace(/\s/g, "").length >= 12) paras.push(t);
    }
  }
  const conc = String(pack.conclusion || "").trim();
  if (conc.replace(/\s/g, "").length >= 12) paras.push(conc);
  return paras;
}

function collectUsedParagraphKeys(pack) {
  return new Set(collectPackParagraphs(pack).map((t) => paragraphKey(t)));
}

function isNearDuplicateParagraph(candidate, existingParas = []) {
  const text = String(candidate || "").trim();
  if (!text) return true;
  for (const prev of existingParas) {
    if (VISIT_GUIDE_PAD_RE.test(prev) && VISIT_GUIDE_PAD_RE.test(text)) return true;
    if (wordOverlapRatio(prev, text) >= 0.86) return true;
  }
  return false;
}

/**
 * polish 후 tier min 미달 시 flavor 패드로 보강 (폴백·공통)
 * @param {object} pack
 * @param {number} minChars
 * @param {object} input
 * @param {{ polishAfter?: boolean, countChars?: (p: object) => number }} [options]
 */
export function deepenMissionProsePack(pack, minChars, input = {}, options = {}) {
  const {
    polishAfter = false,
    countChars = countBlogBodyCharsWithSpaces,
    seedOffset = 0,
  } = options;
  if (!pack?.sections?.length) return pack;
  const p = deriveTopicWritingContext(input);
  const { flavor } = getIndustryFlavorForInput(input);
  let next = pack;
  const pads = buildMissionDeepenPadPool(p, input);
  const usedKeys = collectUsedParagraphKeys(next);
  let existingParas = collectPackParagraphs(next);
  let padCursor = 0;
  let guard = Math.max(0, Number(seedOffset) || 0);
  let dynamicSeq = Math.max(0, Number(seedOffset) || 0);
  const maxGuard = Math.max(pads.length * 5, 120);

  const fictionOk = allowsVisitExperienceDeepen(input);
  const maxRounds = fictionOk ? maxGuard : Math.min(maxGuard, pads.length + 8);

  while (countChars(next) < minChars && guard < maxRounds) {
    const secIdx = guard % next.sections.length;
    let para = null;

    for (let i = 0; i < pads.length; i += 1) {
      const candidate = pads[(padCursor + i) % pads.length];
      const key = paragraphKey(candidate);
      if (!usedKeys.has(key) && !isNearDuplicateParagraph(candidate, existingParas)) {
        para = candidate;
        padCursor = (padCursor + i + 1) % pads.length;
        usedKeys.add(key);
        break;
      }
    }

    if (!para) {
      for (let attempt = 0; attempt < 16; attempt += 1) {
        const dynamic = buildDynamicDeepenPad(p, flavor, input, dynamicSeq);
        dynamicSeq += 1;
        const dKey = paragraphKey(dynamic);
        if (
          !usedKeys.has(dKey) &&
          !isMissionChecklistPad(dynamic) &&
          !isNearDuplicateParagraph(dynamic, existingParas)
        ) {
          para = dynamic;
          usedKeys.add(dKey);
          break;
        }
      }
    }
    if (!para || PADDING_PATTERN_RES.some((re) => re.test(para))) break;

    const sections = [...next.sections];
    sections[secIdx] = {
      ...sections[secIdx],
      body: `${sections[secIdx].body}\n\n${para}`.trim(),
    };
    next = { ...next, sections };
    existingParas.push(para);
    guard += 1;
  }

  if (polishAfter) return polishMissionProsePack(next, input);
  return next;
}

const FINALIZE_MAX_ROUNDS = 12;

/**
 * polish ↔ deepen 반복 후 tier min 충족 (폴백 마무리 SSOT)
 */
export function finalizeMissionProsePack(pack, input = {}, tier = {}) {
  if (shouldSuppressLengthTopoff(pack, input)) {
    return polishMissionProsePack(pack, input);
  }
  const min = tier.min;
  let next = polishMissionProsePack(pack, input);
  let round = 0;
  while (countBlogBodyCharsWithSpaces(next) < min && round < FINALIZE_MAX_ROUNDS) {
    next = deepenMissionProsePack(next, min, input, { polishAfter: false });
    next = polishMissionProsePack(next, input);
    round += 1;
  }
  if (countBlogBodyCharsWithSpaces(next) < min) {
    next = deepenMissionProsePack(next, min, input, { polishAfter: true });
  }
  if (countBlogBodyCharsWithSpaces(next) < min && allowsVisitExperienceDeepen(input)) {
    const scenes = buildStoryTargetSceneLines(input, 8);
    const sections = [...(next.sections || [])];
    const existingParas = collectPackParagraphs(next);
    for (let i = 0; i < scenes.length && countBlogBodyCharsWithSpaces(next) < min; i += 1) {
      const scene = missionProseClean(scenes[i], input);
      if (!scene || isNearDuplicateParagraph(scene, existingParas)) continue;
      if (!sections.length) break;
      const idx = i % sections.length;
      const target = sections[idx];
      if (!target?.body) continue;
      sections[idx] = {
        ...target,
        body: `${target.body}\n\n${scene}`.trim(),
      };
      existingParas.push(scene);
      next = { ...next, sections };
    }
    next = polishMissionProsePack(next, input);
  }
  if (countBlogBodyCharsWithSpaces(next) < min) {
    next = deepenMissionProsePack(next, min, input, { polishAfter: true });
  }
  return next;
}

export { shouldSkipMissionCatalogConclusion } from "@/lib/product/gpt55LlmPackGuard";

export function buildMissionConclusionLine(p, input = {}, displayTopic = "", pack = null) {
  if (pack && shouldSkipMissionCatalogConclusion(pack, input)) return "";
  const topic = displayTopic || topicRaw(input) || p.topicFacet || "이용";
  const profile = resolvePersonaEngineProfile(input);
  let regionPrefix = profile.archetype === "field_review" ? p.regionBit : "";
  if (profile.archetype !== "field_review") {
    if (p.region && p.region !== "현장") {
      regionPrefix = `${p.region} `;
    } else {
      const bit = String(p.regionBit || "")
        .replace(/^현장\s*/, "")
        .trim();
      regionPrefix = bit ? `${bit} ` : "";
    }
  }
  const useInformationalConclusion =
    isInformationalTopicInput(input) ||
    profile.archetype === "essay" ||
    profile.archetype === "expert_column" ||
    profile.archetype === "magazine";
  if (isFlowerRecommendationTopic(input)) {
    return missionProseClean(
      `${p.regionBit}${p.brand} ${topic} — 종류·포장·픽업 시간을 함께 보면 선택이 수월합니다. 무인 픽업·만원대 라인은 매장 안내를 기준으로 확인하시면 됩니다.`
    );
  }
  if (isFurnitureChairProductTopic(input)) {
    return missionProseClean(
      `${p.regionBit}${p.brand} ${topic} — 좌판·등받이·팔걸이를 함께 보면 선택이 수월합니다. 프랜차이즈 쇼룸 안내를 기준으로 확인하시면 됩니다.`
    );
  }
  if (useInformationalConclusion) {
    const { key, flavor } = getIndustryFlavorForInput(input);
    const topic = displayTopic || topicRaw(input) || p.topicFacet || "이용";
    const byKey = {
      flower: `${regionPrefix}${p.brand} ${topic} — 종류·포장·픽업 시간은 매장 안내를 기준으로 확인하시면 됩니다.`,
      education: `${regionPrefix}${p.brand} ${topic} — 대상 학년·특강 일정·등록 안내는 상담 기준으로 확인하시면 됩니다.`,
      craft: `${regionPrefix}${p.brand} ${topic} — 소요 시간·난이도·예약 방법은 매장 안내를 기준으로 확인하시면 됩니다.`,
      pension: `${regionPrefix}${p.brand} ${topic} — 객실·할인·체크인 안내는 예약 문의로 확인하시면 됩니다.`,
      restaurant: `${regionPrefix}${p.brand} ${topic} — 메뉴·예약·방문 시간은 매장 안내를 기준으로 확인하시면 됩니다.`,
      construction: `${regionPrefix}${p.brand} ${topic} — 공사 범위·견적·일정은 상담 안내로 확인하시면 됩니다.`,
      salon: `${regionPrefix}${p.brand} ${topic} — 상담·시술·관리 방법은 매장 안내를 기준으로 확인하시면 됩니다.`,
      default: `${regionPrefix}${p.brand} ${topic} — ${flavor.visitReason} 관련 조건은 매장 안내를 기준으로 확인하시면 됩니다.`,
    };
    return missionProseClean(byKey[key] || byKey.default, input);
  }
  const { flavor } = getIndustryFlavorForInput(input);
  return missionProseClean(
    `${p.regionBit}${p.brand} ${topic} — ${flavor.spaceWord}에서 직접 확인한 뒤 본인 기준으로 정리해 봤어요. ${flavor.visitReason}에 맞는지는 당일 안내를 기준으로 다시 보면 됩니다.`
  );
}

/** gi 섹션 첫 문단 — Human Story lead 고정 */
export function leadMissionGiParagraphs(input = {}) {
  return [buildHumanStoryProblemOpeningLead(input)];
}

/**
 * @param {object} pack
 * @param {object} input
 */
export function polishMissionProsePack(pack, input = {}) {
  if (!pack?.sections?.length) return pack;
  const skipExperienceFilter = pack?._meta?.researchGroundedHumanPack === true;
  let sections = pack.sections.map((sec, idx) => {
    const paras = String(sec.body || "")
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter((p) => p.replace(/\s/g, "").length >= 12);
    const filtered = skipExperienceFilter
      ? paras
      : filterMissionExperienceParagraphs(paras, input);
    let body = filtered.join("\n\n").trim();
    if (
      idx === 0 &&
      !skipExperienceFilter &&
      !isFlowerRecommendationTopic(input) &&
      !isFurnitureChairProductTopic(input)
    ) {
      body = ensureHumanStoryOpeningBody(body, input);
    }
    return { ...sec, body };
  });
  const profile = resolvePersonaEngineProfile(input);
  const essayResearchPack = skipExperienceFilter && profile.archetype === "essay";
  const pruned = sections.filter((s) => String(s.body || "").replace(/\s/g, "").length >= 32);
  if (essayResearchPack) {
    const pruned20 = sections.filter((s) => String(s.body || "").replace(/\s/g, "").length >= 20);
    if (pruned.length >= 4) sections = pruned;
    else if (pruned20.length >= 4) sections = pruned20;
    else if (pruned20.length >= 3) sections = pruned20;
  } else if (pruned.length >= 3) {
    sections = pruned;
  } else {
    sections = sections.filter((s) => String(s.body || "").replace(/\s/g, "").length >= 12);
  }
  let next = { ...pack, sections };
  next = applyRegionVoiceLockToPack(next, input);
  next = applyHumanWriterHeadingGate(next, { input });
  if (!isFurnitureChairProductTopic(input)) {
    next = applyFurnitureExhibitionPackPolish(next, input);
  }
  next = applyHaeyoConsistencyToPack(next);
  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      missionProseEngine: MISSION_PROSE_ENGINE_VERSION,
    },
  };
}

export function scoreMissionProseQuality(pack, input = {}) {
  const full = getBlogFullText(pack);
  const checklistHits = (full.match(/확인하세요|표로\s*정리|이용\s*절차·대기/g) || []).length;
  const hasStoryLead = buildHumanStoryProblemOpeningLead(input).slice(0, 24);
  const leadOk = full.includes(hasStoryLead.slice(0, 16));
  return {
    checklistHits,
    humanStoryLead: leadOk,
    chars: full.replace(/\s/g, "").length,
  };
}
