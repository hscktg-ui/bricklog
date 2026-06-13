/**
 * BRICLOG HUMAN STORY ENGINE — 사람의 문제로 시작 (Signature·Human Writer와 통합)
 * 제품 설명 도입 금지 · 문제→공감→정보→비교→결론
 */
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { INTRO_CONTEXT_MARKERS } from "@/lib/product/editorIntroRules";
import {
  deriveTopicWritingContext,
  isInformationalTopicInput,
  topicWritingFacet,
} from "@/lib/content/topicFacetEngine";
import { shouldApplyHumanStoryOpeningRewrite } from "@/lib/persona/speakerVoiceLock";
import { getIndustryFlavorForInput } from "@/lib/product/industryContextEngine";
import {
  buildStoryTargetProblemOpening,
  resolveStoryTarget,
} from "@/lib/product/storyTargetEngine";

export const HUMAN_STORY_ENGINE_VERSION = "v1";

/** 프롬프트·검수 공통 — Signature 「문제→이유→비교→브랜드→정리」와 동일 축 */
export const HUMAN_STORY_FLOW = [
  "문제",
  "공감",
  "정보",
  "비교",
  "결론",
];

export const HUMAN_STORY_CORE = `【BRICLOG HUMAN STORY ENGINE】
정보를 설명하기 전에, 사람이 왜 이것을 찾는지부터 쓴다.
글의 시작은 제품 설명이 아니라 사람의 상황·고민이다.
브릭로그는 제품을 설명하는 것이 아니라 사람의 상황을 설명한다.`;

export const HUMAN_STORY_FLOW_BRIEF = `글 순서:
문제 → 공감(왜·상황) → 정보(현장·확인) → 비교 → 결론
「공감」은 소제목이 아니라 독자 장면 문장으로 녹인다.`;

export const HUMAN_STORY_XO_EXAMPLES = `【도입 X/O】
침대 X: 모션베드는 헤드 조절이 가능합니다.
침대 O: 아침에 일어나면 허리가 먼저 아픈 사람들이 있다.
꽃집 X: 생화 꽃다발을 판매합니다.
꽃집 O: 꽃을 사야 하는 날은 생각보다 많다. 막상 꽃집을 찾으면 어디로 갈지 모른다.
미용실 X: 두피 케어를 제공합니다.
미용실 O: 염색은 하고 싶은데 두피가 먼저 걱정되는 날이 있다.`;

/** 제품·기능·판매 설명으로 시작하는 패턴 */
export const HUMAN_STORY_PRODUCT_FIRST_RES = [
  /(?:모션\s*베드|침대|매트리스).{0,24}(?:헤드|조절|기능|제공|가능)/,
  /생화\s*꽃다발.{0,12}(?:판매|제공|주문)/,
  /꽃다발.{0,8}판매/,
  /두피\s*케어.{0,12}(?:제공|프로그램|서비스)/,
  /(?:수제|신선).{0,12}간식.{0,16}(?:제조|판매|생산)/,
  /(?:은|는|이)\s+[\w가-힣]{2,18}(?:을|를)\s+(?:제공|판매|소개)(?:합니다|해\s*드립)/,
  /(?:서비스|메뉴|상품|제품)(?:을|를)\s+(?:제공|판매)/,
  /제품은\s+이렇습니다/,
  /기능\s*(?:설명|소개)/,
  /란\s*무엇|이란\s*무엇/,
];

/** @deprecated — industryContextEngine SSOT 사용 */
function resolveStoryIndustryKey(input = {}) {
  return getIndustryFlavorForInput(input).key;
}

/**
 * @param {string} text
 * @param {object} [input]
 */
export function isHumanStoryProductFirstOpening(text, input = {}) {
  if (!isBriclogMissionEnforced()) return false;
  const sample = String(text || "").trim().slice(0, 320);
  if (!sample) return false;
  if (HUMAN_STORY_PRODUCT_FIRST_RES.some((re) => re.test(sample))) return true;
  const brand = String(input.brandName || input.brand || "").trim();
  if (brand.length >= 2) {
    const esc = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`^${esc}(?:은|는)\\s+.{0,40}(?:제공|판매|소개|서비스)`, "i").test(sample)) {
      return true;
    }
  }
  return false;
}

/** 브랜드·후보 검색형 — 사람 문제 도입으로 보지 않음 */
const WEAK_BRAND_SEARCH_OPENING_RES = [
  /^요즘\s+.+알아보면서\s+.+후보에\s*올려/,
  /^솔직히\s+.+검색하다가\s*예약/,
  /^.+에\s*직접\s*가서\s+.+먼저\s*확인/,
];

/**
 * @param {string} text
 */
export function hasHumanStoryContextOpening(text = "", input = {}) {
  const sample = String(text || "").trim().slice(0, 400);
  if (WEAK_BRAND_SEARCH_OPENING_RES.some((re) => re.test(sample))) return false;
  if (
    /(?:은|는)\s+.+?(?:제공|판매)/.test(sample.slice(0, 48)) &&
    !/(?:걱정|고민|아프|막히|당김|각질)/.test(sample)
  ) {
    return false;
  }
  const { flavor } = getIndustryFlavorForInput(input);
  if (
    (flavor.problemOpenings || []).some((o) => {
      const stem = String(o).slice(0, 14);
      return stem.length >= 8 && sample.includes(stem);
    })
  ) {
    return true;
  }
  return (
    /(?:왜|고민|궁금|찾게|계기|상황|걱정|막히|헷갈)/.test(sample) &&
    !/(?:은|는)\s+.+?(?:제공|판매)/.test(sample.slice(0, 48))
  );
}

/**
 * 업종·주제 맞춤 문제형 도입 1문단
 * @param {object} input
 */
export function buildHumanStoryProblemOpening(input = {}) {
  const targetOpening = buildStoryTargetProblemOpening(input);
  if (targetOpening) return targetOpening;

  const p = deriveTopicWritingContext(input);
  const facet = topicWritingFacet(input) || p.topicFacet || p.topicRaw || "이용";
  const { key, flavor } = getIndustryFlavorForInput(input);
  const openingSource = isInformationalTopicInput(input)
    ? flavor.infoProblemOpenings || flavor.problemOpenings
    : flavor.problemOpenings;
  const fromFlavor = (openingSource || []).filter(Boolean);
  const pool =
    fromFlavor.length > 0
      ? fromFlavor
      : [
          `${facet} 때문에 검색하다가 막히는 지점부터 정리해 볼게요.`,
          `생각보다 ${facet} 고르는 기준이 많아서, 왜 지금 찾게 됐는지부터 짚어 볼게요.`,
        ];
  if (key === "furniture" && /모션|헤드/.test(`${input.topic || ""} ${facet}`)) {
    pool.unshift(
      "누워서 각도를 바꾸고 싶은데, 소음·흔들림이 걱정되면 모션 침대부터 망설여진다."
    );
  }
  const idx = Math.abs(String(p.brand || facet).length) % pool.length;
  return pool[idx];
}

/** 제품형 도입 교체 시 항상 첫 번째 문제 문장 사용 */
export function buildHumanStoryProblemOpeningLead(input = {}) {
  const resolved = resolveStoryTarget(input);
  if (resolved?.target?.problemOpenings?.[0]) {
    return resolved.target.problemOpenings[0];
  }
  const { flavor } = getIndustryFlavorForInput(input);
  const openings = isInformationalTopicInput(input)
    ? flavor.infoProblemOpenings || flavor.problemOpenings
    : flavor.problemOpenings;
  const first = openings?.[0];
  if (first) return first;
  return buildHumanStoryProblemOpening(input);
}

/**
 * 첫 섹션 본문 — 제품형 도입이면 문제 문단을 앞에 붙임
 * @param {string} body
 * @param {object} input
 */
export function ensureHumanStoryOpeningBody(body, input = {}) {
  const text = String(body || "").trim();
  if (!text) {
    return shouldApplyHumanStoryOpeningRewrite(input)
      ? buildHumanStoryProblemOpening(input)
      : text;
  }
  if (!shouldApplyHumanStoryOpeningRewrite(input)) {
    if (isHumanStoryProductFirstOpening(text.split(/\n\n+/)[0]?.trim() || text, input)) {
      const opening = buildHumanStoryProblemOpeningLead(input);
      const rest = text.split(/\n\n+/).slice(1).join("\n\n").trim();
      return rest ? `${opening}\n\n${rest}` : opening;
    }
    return text;
  }
  const firstPara = text.split(/\n\n+/)[0]?.trim() || text;
  if (hasHumanStoryContextOpening(firstPara, input) && !isHumanStoryProductFirstOpening(firstPara, input)) {
    return text;
  }
  if (!isHumanStoryProductFirstOpening(firstPara, input) && hasHumanStoryContextOpening(text, input)) {
    return text;
  }
  const opening = buildHumanStoryProblemOpeningLead(input);
  const rest = isHumanStoryProductFirstOpening(firstPara, input)
    ? text.split(/\n\n+/).slice(1).join("\n\n").trim()
    : text;
  return rest ? `${opening}\n\n${rest}` : opening;
}

/**
 * @param {string} fullText
 * @param {object} input
 */
export function scoreHumanStoryOpening(fullText = "", input = {}) {
  if (!isBriclogMissionEnforced()) {
    return { ok: true, score: 100, issues: [] };
  }
  const text = String(fullText || "");
  const firstPara = text.split(/\n\n+/).map((p) => p.trim()).find((p) => p.length >= 20) || text.slice(0, 280);
  const issues = [];

  if (isHumanStoryProductFirstOpening(firstPara, input)) {
    issues.push({ type: "product_first_opening", sample: firstPara.slice(0, 80) });
  } else if (!hasHumanStoryContextOpening(firstPara, input)) {
    issues.push({ type: "missing_human_problem_opening", sample: firstPara.slice(0, 80) });
  }

  const score = issues.length === 0 ? 100 : issues.some((i) => i.type === "product_first_opening") ? 45 : 72;
  return {
    ok: issues.length === 0,
    score,
    issues,
  };
}

export function buildHumanStoryEnginePromptBlock() {
  return [
    HUMAN_STORY_CORE,
    HUMAN_STORY_FLOW_BRIEF,
    HUMAN_STORY_XO_EXAMPLES,
    "도입 첫 문단에 브랜드명·제품 스펙·「제공합니다」「판매합니다」 금지.",
    "타깃 키워드(신혼가구 등)가 있으면 감정·장면으로 도입 — 스펙 나열 금지.",
  ].join("\n\n");
}

export function isHumanStoryEngineEnforced() {
  return isBriclogMissionEnforced();
}
