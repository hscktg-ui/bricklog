/**
 * BRICLOG DEEP LEARNING ENGINE — 사고 단계 SSOT
 * 입력(단서) → 고객 상황 → 현장 장면 → 관점 → 정보 선별 → 에디터 해석 → 검수
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { splitKoreanSentences } from "@/lib/content/v2AxisSentencePrune";
import { deriveTopicWritingContext, topicWritingFacet } from "@/lib/content/topicFacetEngine";
import { getIndustryFlavorForInput } from "@/lib/product/industryContextEngine";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { buildStoryTargetSceneLines, resolveStoryTarget } from "@/lib/product/storyTargetEngine";
import { detectIndustryCommonSenseViolations } from "@/lib/product/humanityCommonSenseEngine";
import { scoreGroundedSpecificity } from "@/lib/content/groundedSpecificityGate";
import { scoreMagazineColumnArc } from "@/lib/content/columnMagazineArchetype";
import { scoreHumanBelief } from "@/lib/product/humanBeliefEngine";
import { titleContext } from "@/lib/content/humanTitleEngine";
import {
  isEditorHumanizationDeclarativeAdvice,
  isEditorHumanizationForbiddenSentence,
  stripEditorHumanizationSentences,
} from "@/lib/product/editorHumanizationEngine";
import { REAL_FIELD_SMELL_RES } from "@/lib/product/checklistVoiceEngine";
import { resolveContentPerspective } from "@/lib/content/perspectiveEngine";
import { isInformationalTopicInput } from "@/lib/content/topicFacetEngine";

export const DEEP_LEARNING_ENGINE_VERSION = "v1";
export const DEEP_LEARNING_MIN_SCORE = 85;
export const DEEP_LEARNING_TARGET_SCORE = 95;
export const DEEP_LEARNING_MIN_FIELD_SCENES = 3;

function re(source, flags = "") {
  return new RegExp(source, flags);
}

/** §6 금지 — editor humanization 외 추가 AI 내부 표현 */
export const DEEP_LEARNING_FORBIDDEN_RES = [
  re("관련\\s*기능[·・]?조건[·・]?절차를\\s*정리"),
  re("이\\s*주제\\s*후보에\\s*올려"),
  re("후보에\\s*올려(?:두|뒀)"),
  re("매장에서\\s*감이\\s*왔"),
  re("확인되지\\s*않은\\s*내용은\\s*단정하지"),
  re("방문\\s*전\\s*예약[·・]?주차[·・]?영업\\s*시간을\\s*확인"),
  re("비교할\\s*때\\s*가격[·・]조건[·・]사후\\s*지원을\\s*정리"),
  re("이용\\s*절차[·・]?대기[·・]?상담\\s*흐름을\\s*파악"),
  re("공식\\s*안내\\s*기준으로\\s*확인하는\\s*것"),
];

/** §7 변수 치환 실패 */
export const VARIABLE_SUBSTITUTION_FAIL_RES = [
  re("[가-힣]{2,8}\\s+그래서\\s+[가-힣]{2,12}(?:침대|매장|브랜드)"),
  re("매장를"),
  re("매장는"),
  re("이\\s*주제\\s*후보"),
  re("이\\s*주제(?!를)"),
  re("이\\s*매장는"),
  re("본\\s*톤·연출"),
  re("\\.라는\\s*설명"),
  re("업체\\s*소개를\\s*직접\\s*가서"),
  re("소식\\s*보러\\s+[가-힣]{1,6}\\s+까지"),
  re("현장\\s*매장"),
  re("{{|}}|\\[브랜드\\]|\\[지역\\]"),
];

/** §9 업종 상식 — 필수·금지 키워드 */
const INDUSTRY_SENSE = {
  pet: {
    required: /원재료|제조|보관|급여|알레르기|기호|간식|반려|강아지|펫/,
    forbidden: /설치|견적서|모델\s*재고|체험존|헤드\s*각도|배송\s*설치/,
  },
  furniture: {
    required: /쇼룸|프레임|매트리스|침실|동선|높이|소재|배송|설치|체험|전시/,
    forbidden: /원재료|급여량|반려견\s*기호/,
  },
  salon: {
    required: /상담|두피|컬러|손상|시술|관리|염색|디자이너/,
    forbidden: /설치|배송|모델\s*재고/,
  },
  flower: {
    required: /꽃|구성|색감|포장|예약|보관|선물/,
    forbidden: /A\/S|설치|견적서/,
  },
};

/** §2 고객 상황 풀 */
const CUSTOMER_SITUATIONS = {
  furniture: [
    "신혼 침실을 처음 꾸민다",
    "이사 전 침대를 바꾸려 한다",
    "사진만 보고 프레임을 고르기 어렵다",
    "매트리스와 프레임 조합이 헷갈린다",
    "침실 분위기를 직접 보고 싶다",
    "전시 소식을 보고 쇼룸에 가보려 한다",
  ],
  pet: [
    "강아지에게 아무 간식이나 먹이기 불안하다",
    "원재료가 궁금하다",
    "알레르기나 기호성이 걱정된다",
    "시중 간식보다 믿을 수 있는 곳을 찾는다",
    "선물용 또는 정기 구매처를 찾는다",
  ],
  salon: [
    "두피가 예민해서 염색이 걱정된다",
    "사진 속 컬러와 실제 결과가 다를까 봐 고민된다",
    "디자이너 상담을 충분히 받고 싶다",
    "가격보다 손상 관리가 중요하다",
  ],
  flower: [
    "선물용 꽃을 고르는데 색감이 걱정된다",
    "당일 픽업·배송이 가능한지 알고 싶다",
    "포장 스타일을 직접 보고 싶다",
    "시즌 꽃 상태를 확인하고 싶다",
  ],
  cafe: [
    "분위기 좋은 자리를 찾는다",
    "메뉴 옵션이 많아 고르기 어렵다",
    "테이크아웃과 매장 이용이 헷갈린다",
  ],
  default: [
    "검색하다 보니 직접 가서 확인하고 싶어졌다",
    "사진과 실제가 다를까 봐 망설여진다",
    "비교 기준이 아직 정리되지 않았다",
  ],
};

const FIELD_SCENE_MARKERS = [
  ...REAL_FIELD_SMELL_RES,
  re("입구에서|진열대|의자에\\s*앉|문을\\s*열|쇼룸에\\s*서|한\\s*바퀴"),
  re("먼저\\s*눈에|들어왔|보였|연출|조명\\s*아래"),
];

export const DEEP_LEARNING_PIPELINE_BRIEF = `【DEEP LEARNING · 작성 전 사고 순서】
입력(지역·브랜드·업종·주제)=단서 → 업종 이해 → 고객 상황 추론 → 현장 장면 상상(3+) → 관점 정리 → 정보 수집·선별 → 에디터 해석 → 문단 설계 → 문장 → 인간성 검수.
제품·브랜드·행사 안내로 시작 금지. 정보는 고객 상황과 연결해 해석한다.`;

export function isDeepLearningForbidden(text = "") {
  const t = String(text || "").trim();
  if (!t) return false;
  return (
    isEditorHumanizationForbiddenSentence(t) ||
    isEditorHumanizationDeclarativeAdvice(t) ||
    DEEP_LEARNING_FORBIDDEN_RES.some((rx) => rx.test(t))
  );
}

export function isVariableSubstitutionFailure(text = "") {
  const t = String(text || "").trim();
  if (!t || t.replace(/\s/g, "").length < 8) return false;
  return VARIABLE_SUBSTITUTION_FAIL_RES.some((rx) => rx.test(t));
}

/**
 * §1 입력 단서 → 추론 질문
 * @param {object} input
 */
export function buildClueInferenceBrief(input = {}) {
  const p = deriveTopicWritingContext(input);
  const facet = topicWritingFacet(input) || p.topicFacet || "이용";
  const lines = [
    `누가 「${facet}」를 검색할까?`,
    `왜 ${p.brand}${p.region ? ` · ${p.region}` : ""} 맥락에서 이 주제를 보러 갈까?`,
    "사진만 보고 결정하기 어려운 이유는 무엇일까?",
    "현장에서 실제로 확인해야 할 것은 무엇일까?",
    `${p.brand}라는 브랜드는 이 선택에서 어떤 의미일까?`,
  ];
  if (p.region) {
    lines.push(`${p.region}는 방문 동선·일정에서 어떤 역할을 할까?`);
  }
  return lines;
}

/**
 * §2 고객 상황 추론
 * @param {object} input
 */
export function inferCustomerSituations(input = {}) {
  const { key } = getIndustryFlavorForInput(input);
  const pool = CUSTOMER_SITUATIONS[key] || CUSTOMER_SITUATIONS.default;
  const blob = `${input.topic || ""} ${input.mainKeyword || ""} ${(input.researchFacts || []).join(" ")}`.toLowerCase();
  const scored = pool.map((situation) => {
    let score = 1;
    const words = situation.replace(/[^\w가-힣\s]/g, "").split(/\s+/).filter((w) => w.length >= 2);
    for (const w of words) {
      if (blob.includes(w)) score += 2;
    }
    return { situation, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const resolved = resolveStoryTarget(input);
  const primary = scored.slice(0, 3).map((s) => s.situation);
  return {
    industryKey: key,
    situations: primary,
    storyTarget: resolved?.target?.label || null,
    required: primary.length > 0,
    brief: primary.map((s, i) => `${i + 1}. ${s}`).join("\n"),
  };
}

export function buildFieldScenePlan(input = {}, count = DEEP_LEARNING_MIN_FIELD_SCENES) {
  const scenes = buildStoryTargetSceneLines(input, count);
  const customer = inferCustomerSituations(input);
  return {
    minScenes: count,
    scenes,
    customerSituations: customer.situations,
    storyTarget: customer.storyTarget,
  };
}

export function countFieldScenesInText(fullText = "") {
  const paras = String(fullText || "").split(/\n\n+/);
  let count = 0;
  for (const para of paras) {
    if (FIELD_SCENE_MARKERS.some((rx) => rx.test(para)) && para.replace(/\s/g, "").length >= 16) {
      count += 1;
    }
  }
  return count;
}

function perspectiveMismatchIssues(fullText = "", input = {}) {
  const perspective = resolveContentPerspective(input);
  const t = String(fullText || "");
  const issues = [];
  const checklistHeavy =
    /안내\s*기준|확인하세요|체크리스트|FAQ|비교할\s*때\s*가격/.test(t);
  const reviewHeavy = /다녀왔|누워보|느꼈|솔직|막상/.test(t);

  if ((perspective === "review" || perspective === "storytelling") && checklistHeavy && !reviewHeavy) {
    issues.push("perspective_checklist_in_review");
  }
  const infoPerspective =
    perspective === "informational" || isInformationalTopicInput(input);
  if (
    infoPerspective &&
    /(?:가보니까\s*괜찮|좋았어요|직접\s*가서|다녀왔|상담해\s*주셨|비교해\s*봤)/.test(t) &&
    !/확인|조건|구성|정리했습니다|확인된\s*범위/.test(t)
  ) {
    issues.push("perspective_review_in_info");
  }
  if (perspective === "brand" && /주차|영업\s*시간/.test(t) && !/철학|가치|경험|연출/.test(t)) {
    issues.push("perspective_ops_in_brand");
  }
  return issues;
}

function scoreIndustrySense(fullText = "", input = {}) {
  const { key } = getIndustryFlavorForInput(input);
  const rule = INDUSTRY_SENSE[key];
  if (!rule) return { score: 15, ok: true };
  const t = String(fullText || "");
  let score = 15;
  if (rule.required && !rule.required.test(t)) score -= 8;
  if (rule.forbidden && rule.forbidden.test(t)) score -= 12;
  return { score: Math.max(0, score), ok: score >= 8 };
}

/**
 * §10 에디터 스코어링 (100점)
 */
export function scoreDeepLearning(pack, input = {}) {
  if (!isBriclogMissionEnforced()) {
    return { ok: true, total: 100, dimensions: {}, issues: [] };
  }

  const full = getBlogFullText(pack);
  const issues = [];
  const belief = scoreHumanBelief(full, input, pack);
  const grounded = scoreGroundedSpecificity(full, input, pack);
  const magazine = scoreMagazineColumnArc(pack);
  const commonSense = detectIndustryCommonSenseViolations(full, input);
  const { region, brand, topic } = titleContext({}, input);

  let humanity = 25;
  const forbiddenCount = splitKoreanSentences(full).filter((s) => isDeepLearningForbidden(s)).length;
  const varFailCount = splitKoreanSentences(full).filter((s) => isVariableSubstitutionFailure(s)).length;
  humanity -= forbiddenCount * 6;
  humanity -= varFailCount * 8;
  if (belief.score < 70) humanity -= 6;
  humanity = Math.max(0, Math.min(25, humanity));
  if (forbiddenCount) issues.push(`forbidden:${forbiddenCount}`);
  if (varFailCount) issues.push(`variable_fail:${varFailCount}`);

  let observation = 20;
  const sceneCount = countFieldScenesInText(full);
  if (sceneCount < DEEP_LEARNING_MIN_FIELD_SCENES) {
    observation -= (DEEP_LEARNING_MIN_FIELD_SCENES - sceneCount) * 5;
    issues.push(`field_scenes:${sceneCount}`);
  }
  if (!REAL_FIELD_SMELL_RES.some((rx) => rx.test(full))) observation -= 4;
  observation = Math.max(0, Math.min(20, observation));

  let brandness = 20;
  if (brand && !full.includes(brand)) brandness -= 10;
  const brandOnlyGeneric = brand && /후기|매장/.test(full) && !new RegExp(brand).test(full.slice(0, 200));
  if (brandOnlyGeneric) brandness -= 6;
  if (commonSense.industryMismatch?.length) {
    brandness -= commonSense.industryMismatch.length * 4;
    issues.push("industry_mismatch");
  }
  brandness = Math.max(0, Math.min(20, brandness));

  let information = 15;
  information = Math.round((grounded.score || 60) / 100 * 15);
  if (grounded.score < 55) issues.push("info_thin");

  let structure = 10;
  structure = Math.round((magazine.score || 60) / 100 * 10);
  if (!magazine.ok) issues.push("structure_weak");

  let seoNatural = 10;
  if (topic && topic.length >= 4) {
    const esc = topic.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const hits = (full.match(new RegExp(esc, "g")) || []).length;
    if (hits > 8) {
      seoNatural -= 4;
      issues.push("topic_repeat");
    }
  }
  if (region && full.split(region).length > 6) {
    seoNatural -= 3;
    issues.push("region_repeat");
  }
  seoNatural = Math.max(0, Math.min(10, seoNatural));

  const industrySense = scoreIndustrySense(full, input);
  information = Math.min(15, information + Math.round(industrySense.score / 5) - 2);

  const perspectiveIssues = perspectiveMismatchIssues(full, input);
  if (perspectiveIssues.length) {
    humanity -= perspectiveIssues.length * 3;
    issues.push(...perspectiveIssues);
  }

  const total = Math.round(humanity + observation + brandness + information + structure + seoNatural);
  const ok = total >= DEEP_LEARNING_MIN_SCORE && forbiddenCount === 0 && varFailCount === 0;

  return {
    version: DEEP_LEARNING_ENGINE_VERSION,
    total,
    ok,
    excellent: total >= DEEP_LEARNING_TARGET_SCORE,
    dimensions: {
      humanity,
      observation,
      brandness,
      information,
      structure,
      seoNatural,
      fieldScenes: sceneCount,
    },
    issues: [...new Set(issues)],
    customerSituations: inferCustomerSituations(input),
  };
}

function stripBadSentencesFromText(text = "") {
  const sentences = splitKoreanSentences(text);
  const kept = sentences.filter((s) => {
    const t = s.trim();
    if (t.replace(/\s/g, "").length < 8) return false;
    if (isDeepLearningForbidden(t)) return false;
    if (isVariableSubstitutionFailure(t)) return false;
    return true;
  });
  return kept.join(" ").trim();
}

function ensureMinFieldScenes(pack, input = {}, min = DEEP_LEARNING_MIN_FIELD_SCENES) {
  const full = getBlogFullText(pack);
  if (countFieldScenesInText(full) >= min) return pack;

  const scenes = buildStoryTargetSceneLines(input, min);
  if (!scenes.length || !pack?.sections?.length) return pack;

  const sections = [...pack.sections];
  const targets = [1, 2, Math.min(3, sections.length - 1)].filter(
    (i) => i >= 0 && i < sections.length
  );

  let sceneIdx = 0;
  for (const idx of targets) {
    if (sceneIdx >= scenes.length) break;
    const line = scenes[sceneIdx];
    sceneIdx += 1;
    const body = String(sections[idx].body || "");
    if (body.includes(line.slice(0, 18))) continue;
    sections[idx] = {
      ...sections[idx],
      body: body.trim() ? `${body.trim()}\n\n${line}` : line,
    };
  }

  return { ...pack, sections };
}

/**
 * @param {object} pack
 * @param {object} input
 */
export function applyDeepLearningPack(pack, input = {}) {
  if (!isBriclogMissionEnforced() || !pack?.sections?.length) return pack;
  if (pack._meta?.deepLearningApplied) return pack;

  let next = {
    ...pack,
    sections: (pack.sections || []).map((sec) => ({
      ...sec,
      heading: stripBadSentencesFromText(sec.heading || ""),
      body: String(sec.body || "")
        .split(/\n\n+/)
        .map((p) => stripBadSentencesFromText(p))
        .filter((p) => p.replace(/\s/g, "").length >= 12)
        .join("\n\n"),
    })),
    conclusion: pack.conclusion
      ? stripBadSentencesFromText(pack.conclusion)
      : pack.conclusion,
  };

  next = ensureMinFieldScenes(next, input, DEEP_LEARNING_MIN_FIELD_SCENES);

  const score = scoreDeepLearning(next, input);
  const plan = buildFieldScenePlan(input);

  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      deepLearningApplied: true,
      deepLearningScore: score.total,
      deepLearningOk: score.ok,
      deepLearningIssues: score.issues,
      deepLearningDimensions: score.dimensions,
      customerSituations: plan.customerSituations,
      fieldScenePlan: plan.scenes,
    },
  };
}

export function buildDeepLearningPreWriteBrief(input = {}) {
  if (!isBriclogMissionEnforced()) return "";
  const clues = buildClueInferenceBrief(input);
  const customer = inferCustomerSituations(input);
  const scenes = buildFieldScenePlan(input);
  const perspective = resolveContentPerspective(input);

  return [
    `【DEEP LEARNING ENGINE ${DEEP_LEARNING_ENGINE_VERSION}】`,
    DEEP_LEARNING_PIPELINE_BRIEF,
    "",
    "【입력 단서 → 먼저 답할 질문】",
    ...clues.map((q) => `- ${q}`),
    "",
    "【고객 상황 — 없으면 글 쓰지 말 것】",
    customer.brief || "- (상황 추론 필요)",
    customer.storyTarget ? `스토리 타깃: ${customer.storyTarget}` : "",
    "",
    `【관점: ${perspective} — 관점이 섞이면 실패】`,
    "",
    "【현장 장면 3개 이상 — 정보 설명 전에 장면】",
    ...scenes.scenes.map((s, i) => `${i + 1}. ${s}`),
    "",
    `출력 전 총점 ${DEEP_LEARNING_MIN_SCORE}점 미만 금지 · ${DEEP_LEARNING_TARGET_SCORE}점 목표.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildDeepLearningPromptBlock(input = {}) {
  return buildDeepLearningPreWriteBrief(input);
}
