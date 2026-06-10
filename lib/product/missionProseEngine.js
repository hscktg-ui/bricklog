/**
 * BRICLOG MISSION PROSE ENGINE — 폴백·후처리 SSOT (특정 샘플·브랜드 하드코딩 금지)
 * Human Story · Industry Flavor · Checklist 필터 · Region Lock
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import {
  deriveTopicWritingContext,
  isInformationalTopicInput,
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

export const MISSION_PROSE_ENGINE_VERSION = "v1.3";

const VISIT_GUIDE_PAD_RE = /에\s*직접\s*가서\s+.+?\s+관련\s+안내를\s+들었어요/;

function moodPairObject(m0, m1) {
  return `${m0}와 ${koreanObjectParticle(m1)}`;
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
  /선택이\s*수월/,
  /목적별로\s*달라지는\s*기준을\s*먼저\s*정리/,
  /확인\s*가능한\s*범위만/,
  /헷갈리는\s*포인트/,
];

export function filterMissionExperienceParagraphs(paras = [], input = {}) {
  return paras.filter((p) => {
    const t = String(p || "").trim();
    if (t.replace(/\s/g, "").length < 12) return false;
    if (isDisplayBodyForbidden(t, input)) return false;
    if (isMissionChecklistPad(t)) return false;
    if (isEditorHumanizationForbiddenSentence(t)) return false;
    if (isEditorHumanizationDeclarativeAdvice(t)) return false;
    if (isDeepLearningForbidden(t)) return false;
    if (isVariableSubstitutionFailure(t)) return false;
    if (isMissionOutputDefectSentence(t, input)) return false;
    if (/오피모/i.test(`${input.topic || ""} ${input.mainKeyword || ""}`) && isOpimoUnverifiedSentence(t, input)) {
      return false;
    }
    return true;
  });
}

/**
 * 업종 flavor 기반 경험 문단 풀 — 모든 카테고리 공통
 * @param {ReturnType<typeof deriveTopicWritingContext>} p
 * @param {object} input
 * @param {string[]} researchLines
 */
function buildInformationalMissionCatalog(p, input = {}, researchLines = []) {
  const { key, flavor } = getIndustryFlavorForInput(input);
  const facet = topicWritingFacet(input) || p.topicFacet || p.topicRaw || topicReaderPhrase(input, 0);
  const moodA = flavor.moodWords?.[0] || "분위기";
  const moodB = flavor.moodWords?.[1] || "응대";

  const universal = [
    buildHumanStoryProblemOpening(input),
    `요즘 ${facet} 알아보던 중 ${p.regionBit}${p.brand}에 직접 가볼 일이 생겼어요.`,
    `색감·보관은 매장에서 직접 보면서 비교했어요.`,
    `${p.regionBit}${p.brand}에서 ${facet} 관련 안내를 들으며 메모해 뒀어요.`,
    ...researchLines,
  ];

  const byKey = {
    flower: [
      `진열대에서 여름 톤 꽃을 하나씩 비교해 봤어요.`,
      `생일·축하처럼 목적을 말하니 추천 구성이 달라졌어요.`,
      `배송·픽업 시간을 상담 초반에 확인해 두니 일정 맞추기가 수월했어요.`,
      `리본·카드 문구 샘플을 같이 보며 ${moodPairObject(moodA, moodB)}에 맞춰 골랐어요.`,
      `당일 재고와 예약 주문 가능 여부를 따로 안내받았어요.`,
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
  if (isInformationalTopicInput(input)) {
    return filterMissionExperienceParagraphs(
      buildInformationalMissionCatalog(p, input, researchLines),
      input
    );
  }

  const { flavor } = getIndustryFlavorForInput(input);
  const facet = topicWritingFacet(input) || p.topicFacet || p.topicRaw || "이용";
  const moodA = flavor.moodWords?.[0] || "분위기";
  const moodB = flavor.moodWords?.[1] || "응대";

  return filterMissionExperienceParagraphs(
    [
      buildHumanStoryProblemOpening(input),
      `요즘 ${facet} 알아보던 중 ${p.regionBit}${p.brand}에 직접 가볼 일이 생겼어요.`,
      `${p.regionBit}${p.brand} ${flavor.spaceWord}에 들어가니 ${flavor.productWord} 안내를 먼저 들었어요.`,
      `처음엔 ${facet}만 보다가, ${flavor.spaceWord}에 서니 기준이 조금 달라졌어요.`,
      `상담·안내를 들으며 ${flavor.visitReason}에 맞는지 직접 확인했어요.`,
      `직원분이 ${moodPairObject(moodA, moodB)} 쪽을 먼저 짚어 주셔서 비교하기 수월했어요.`,
      `견적·조건은 당일 기준으로 메모해 두고 집에서 다시 비교했어요.`,
      `주말·피크 시간대는 대기가 있을 수 있어 평일 오전·초저녁이 한산하다고 안내받았어요.`,
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
  const rawSubject = topicRaw(input) || p.topicRaw || p.topicFacet || topicReaderPhrase(input, 0);
  const subject = informationalSubjectLabel(rawSubject, input);
  const m0 = flavor.moodWords?.[0] || "분위기";
  const m1 = flavor.moodWords?.[1] || "응대";
  const universal = [
    `${p.regionBit}${p.brand} ${flavor.spaceWord}에 들어가니 ${flavor.productWord} 안내를 먼저 들었어요.`,
    `처음엔 ${subjectObject(subject)} 고를 때 ${m0}만 보다가, 매장에서 보니 기준이 달라졌어요.`,
  ];
  const byKey = {
    flower: [
      `시즌 생화 톤과 포장 스타일을 먼저 보여 주셔서 맞추기 수월했어요.`,
      `줄기·리본 마감을 직접 보며 당일 픽업·배송 가능 여부를 확인했어요.`,
      `목적을 말하니 추천 구성이 길어지지 않았어요.`,
      `꽃 종류별 ${m0} 차이를 진열대에서 하나씩 비교해 봤어요.`,
    ],
    default: [
      `${subject} 관련 ${m0}·${m1} 조건은 확인 가능한 범위에서만 안내합니다.`,
      `시즌·재고·행사 조건은 날짜에 따라 달라질 수 있어 매장 확인이 필요합니다.`,
      `${p.regionBit || ""}${p.brand} 안내는 공식 채널·매장 기준으로 정리했습니다.`,
    ],
  };
  return filterMissionExperienceParagraphs(
    [...universal, ...(byKey[key] || byKey.default)].map((line) => missionProseClean(line, input)),
    input
  );
}

function buildIndustryFieldPads(key, flavor, p, input = {}) {
  if (isInformationalTopicInput(input)) {
    return buildInformationalFieldPads(key, flavor, p, input);
  }

  const subject = topicRaw(input) || p.topicRaw || p.topicFacet || "이용";
  const m0 = flavor.moodWords?.[0] || "분위기";
  const m1 = flavor.moodWords?.[1] || "응대";
  const m2 = flavor.moodWords?.[2] || "조건";
  const universal = [
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
  const experience = allowsFictionalExperience(input)
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
  if (isInformationalTopicInput(input) || !allowsFictionalExperience(input)) {
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

function buildServiceDeepenPads(p, flavor, input, seq) {
  const subject = topicRaw(input) || p.topicRaw || p.topicFacet || "이용";
  const facet = topicWritingFacet(input) || p.topicFacet || subject;
  const { key } = getIndustryFlavorForInput(input);
  const m0 = flavor.moodWords?.[seq % 3] || "분위기";
  const m1 = flavor.moodWords?.[(seq + 1) % 3] || "응대";
  const universal = [
    `${subjectObject(facet)} 고를 때 ${m0}·${m1}·선물 목적을 함께 보면 비교가 수월합니다.`,
    `${p.brand} ${facet} 관련 안내는 시즌·재고에 따라 달라질 수 있어 확인이 필요합니다.`,
    `${p.regionBit}${p.brand} 기준으로 ${facet} 구성·옵션을 중립적으로 정리했습니다.`,
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
  if (isInformationalTopicInput(input)) {
    const m0 = flavor.moodWords?.[seq % 3] || "성분";
    const m1 = flavor.moodWords?.[(seq + 1) % 3] || "보관";
    const infoPads = [
      `${subjectObject(subject)} 고를 때 ${m0}·${m1}·선물 목적을 함께 보면 비교가 수월합니다.`,
      `${p.brand}에서 안내하는 ${subject} 관련 조건은 제품·시즌에 따라 달라질 수 있습니다.`,
      `알레르기·원재료 표기는 ${subject} 선택 시 먼저 확인하는 편이 좋습니다.`,
      `유통기한·냉장 보관 여부는 라벨 기준으로 다시 한번 보면 됩니다.`,
    ];
    return missionProseClean(infoPads[seq % infoPads.length], input);
  }
  if (!allowsFictionalExperience(input)) {
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
    `${p.regionBit}${p.brand}에서 ${subjectObject(subject)} 볼 때 ${moodPairObject(m0, m1)} ${seq + 1}번째로 다시 확인했어요.`,
    `상담 중 ${flavor.productWord} 관련 설명을 들으며 ${flavor.visitReason}에 맞는지 짚어 봤어요.`,
    `${flavor.spaceWord}에서 ${m0} 차이를 비교하며 ${subject} 기준을 조금씩 좁혀 갔어요.`,
    `당일 ${m1} 안내를 메모해 두고 ${subject} 후보를 다시 정리해 봤어요.`,
    `${p.brand} ${flavor.spaceWord} — ${m0}와 ${koreanObjectParticle(m2)} 쪽을 현장에서 직접 봤어요.`,
    `${p.regionBit}${p.brand} 상담 ${seq + 2}번째로 ${m2} 관련 설명을 들으며 메모를 보강했어요.`,
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

  const fictionOk = allowsFictionalExperience(input);
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

const FINALIZE_MAX_ROUNDS = 6;

/**
 * polish ↔ deepen 반복 후 tier min 충족 (폴백 마무리 SSOT)
 */
export function finalizeMissionProsePack(pack, input = {}, tier = {}) {
  if (shouldSuppressLengthTopoff(pack, input)) {
    return polishMissionProsePack(pack, input);
  }
  const min = tier.min || 1800;
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
  if (countBlogBodyCharsWithSpaces(next) < min && allowsFictionalExperience(input)) {
    const scenes = buildStoryTargetSceneLines(input, 8);
    const sections = [...(next.sections || [])];
    const existingParas = collectPackParagraphs(next);
    for (let i = 0; i < scenes.length && countBlogBodyCharsWithSpaces(next) < min; i += 1) {
      const scene = missionProseClean(scenes[i], input);
      if (!scene || isNearDuplicateParagraph(scene, existingParas)) continue;
      const idx = i % sections.length;
      sections[idx] = {
        ...sections[idx],
        body: `${sections[idx].body}\n\n${scene}`.trim(),
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

export function buildMissionConclusionLine(p, input = {}, displayTopic = "") {
  const topic = displayTopic || topicRaw(input) || p.topicFacet || "이용";
  if (isInformationalTopicInput(input)) {
    return missionProseClean(
      `${p.regionBit}${p.brand} ${topic} — 성분·보관·선물 목적을 함께 보면 선택이 수월합니다. 궁금한 점은 매장 문의로 확인하시면 됩니다.`
    );
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
  let sections = pack.sections.map((sec, idx) => {
    const paras = String(sec.body || "")
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter((p) => p.replace(/\s/g, "").length >= 12);
    const filtered = filterMissionExperienceParagraphs(paras, input);
    let body = filtered.join("\n\n").trim();
    if (idx === 0) body = ensureHumanStoryOpeningBody(body, input);
    return { ...sec, body };
  });
  const pruned = sections.filter((s) => String(s.body || "").replace(/\s/g, "").length >= 32);
  if (pruned.length >= 3) {
    sections = pruned;
  } else {
    sections = sections.filter((s) => String(s.body || "").replace(/\s/g, "").length >= 12);
  }
  let next = { ...pack, sections };
  next = applyRegionVoiceLockToPack(next, input);
  next = applyHumanWriterHeadingGate(next, { input });
  next = applyFurnitureExhibitionPackPolish(next, input);
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
