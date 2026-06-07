/**
 * BRICLOG SIGNATURE WRITING ENGINE — 관점·순서·업종 서명 SSOT
 *
 * Human Writer = 장르·금지(설명서/FAQ)
 * Signature     = 관점·「왜」→브랜드 순서·업종 톤
 * Brand Memory  = 연속된 다음 장
 */

import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { getIndustryFlavor } from "@/lib/prompts/engine/industryFlavor";
import { koreanObjectParticle } from "@/lib/prompts/engine/textUtils";
import { topicWritingFacet } from "@/lib/content/topicFacetEngine";
import {
  buildHumanStoryEnginePromptBlock,
  isHumanStoryProductFirstOpening,
} from "@/lib/product/humanStoryEngine";

export const SIGNATURE_WRITING_VERSION = "v1";

export const SIGNATURE_WRITING_CORE = `【BRICLOG SIGNATURE WRITING ENGINE】
브릭로그는 정보를 설명하지 않는다. 브릭로그는 관점을 설명한다.
브랜드명 · 지역명 · 주제명은 글의 재료일 뿐 — 제목·도입의 주인공이 아니다.`;

export const SIGNATURE_WHY_FIRST = `모든 글은 "왜"에서 시작한다.
독자는 제품을 찾는 것이 아니라 문제를 해결하려고 검색한다.`;

export const SIGNATURE_MOTION_BED_EXAMPLE = `예시 (모션베드):
모션베드 → 왜 침대를 바꾸려 하는가 → 어떤 불편함이 있었는가 → 어떤 기준으로 비교해야 하는가 → 브랜드는 어떤 선택지인가`;

/** 본문 전개 순서 — 프롬프트·검수 공통 */
export const SIGNATURE_WRITING_FLOW = [
  "문제",
  "이유",
  "비교 기준",
  "브랜드",
  "정리",
];

export const SIGNATURE_FLOW_BRIEF = `글 순서 (고정):
문제 → 이유 → 비교 기준 → 브랜드 → 정리
브랜드·제품·기능 설명으로 시작 금지.`;

export const SIGNATURE_FORBIDDEN_START = `【도입 금지】
글·첫 섹션을 브랜드 소개 · 제품 설명 · 기능 설명 · "제품은 이렇습니다" 로 시작하지 말 것.`;

export const SIGNATURE_VOICE_RULE = `【화법】
금지: "제품은 이렇습니다"
사용: "왜 사람들이 이것을 찾게 되는가"`;

export const SIGNATURE_ALLOWED_FOCUS = `【허용 초점】
실제 상황 · 실제 고민 · 실제 선택 과정 · 실제 비교 기준`;

/** 본문 소제목·섹션 제목으로 사용 금지 (Human Writer + Signature 통합) */
export const SIGNATURE_FORBIDDEN_HEADING_PHRASES = [
  "브랜드 이해",
  "브랜드 소개",
  "제품군",
  "제품군 소개",
  "제품 설명",
  "라인업",
  "라인업 소개",
  "기능 설명",
  "가격 비교 포인트",
  "행사 기간",
  "설치 안내",
  "AS 안내",
  "A/S 안내",
  "체크리스트",
  "체크리스트 나열",
  "FAQ",
  "FAQ 형식",
  "자주 묻는 질문",
  "보고서",
  "제품 소개서",
  "브로슈어",
  "설명서",
  "방문 시 확인",
  "방문 예약 방법",
  "설치와 배송",
  "A/S와 교환",
  "행사와 할인",
];

export const SIGNATURE_HEADING_REWRITES = {
  "브랜드 이해": "비교할 때 막히는 지점",
  "브랜드 소개": "선택 전에 헷갈리는 부분",
  "제품군": "어떤 선택지가 헷갈리는지",
  "제품군 소개": "어떤 선택지가 헷갈리는지",
  "제품 설명": "어떤 불편함에서 출발했는가",
  "라인업": "어떤 모델·옵션을 비교하는지",
  "라인업 소개": "어떤 모델·옵션을 비교하는지",
  "기능 설명": "실제로 체감되는 차이",
  "가격 비교 포인트": "가격·혜택을 볼 때 막히는 지점",
  "행사 기간": "지금 확인해야 할 시점·조건",
  "설치 안내": "배송·설치 전에 알아두면 좋은 점",
  "AS 안내": "사후 관리·문의 전에 볼 것",
  "A/S 안내": "사후 관리·문의 전에 볼 것",
  "체크리스트": "방문·구매 전에 짚어볼 것",
  "체크리스트 나열": "방문·구매 전에 짚어볼 것",
  "FAQ": "독자가 실제로 궁금해하는 것",
  "FAQ 형식": "독자가 실제로 궁금해하는 것",
  "자주 묻는 질문": "독자가 실제로 궁금해하는 것",
  "보고서": "현장에서 확인한 내용",
  "제품 소개서": "직접 확인한 특징",
  "브로슈어": "매장·현장에서 본 점",
  "설명서": "쓰기 전에 알아야 할 맥락",
  "방문 시 확인": "쇼룸에서 체험할 때 본 점",
  "방문 예약 방법": "당일 쇼룸·상담 흐름",
  "설치와 배송": "배송·설치는 당일 안내 기준으로",
  "A/S와 교환": "사후 문의 전에 본 것",
  "행사와 할인": "전시·행사 조건 메모",
  "특징과 기능": "전시대에서 직접 본 구성",
};

/** 첫 문단·도입 휴리스틱 */
export const SIGNATURE_FORBIDDEN_OPENING_RES = [
  /브랜드\s*소개/,
  /제품\s*설명/,
  /기능\s*설명/,
  /제품은\s*이렇습니다/,
  /소개해\s*드리/,
  /알아보겠습니다/,
  /에\s*대해\s*알아보/,
  /란\s*무엇/,
  /이란\s*무엇/,
];

export const SIGNATURE_PRODUCT_IDENTITY = `브릭로그는 SEO 글쓰기 툴이 아니다. 브랜드 에디터를 자동화하는 시스템이다.
정보를 많이 쓰는 AI가 아니라, 정보를 브랜드·업종 관점으로 해석하는 AI다.`;

export const SIGNATURE_SUCCESS_METRIC = `최종 목표:
"AI가 잘 썼네" (X) → "이 브랜드를 오래 본 사람이 썼네" (O)`;

/** 에이전트 보완 — 사용자 원칙 위 계층 정리 */
export const SIGNATURE_AGENT_LAYER_NOTE = `【엔진 계층 · 중복 금지】
Signature=관점·순서 | Human Writer=장르·조사재료 | Brand Memory=연속 서사 | Anti SEO=반복 상한 | Editor=신뢰·축적`;

export function isSignatureWritingEnforced() {
  return isBriclogMissionEnforced();
}

function resolveIndustryFlavorKey(industry = "") {
  const v = String(industry).toLowerCase();
  if (/꽃|flower|플라워/.test(v)) return "flower";
  if (/카페|cafe|coffee/.test(v)) return "cafe";
  if (/가구|침대|furniture|모션|매트리스|인테리어/.test(v)) return "furniture";
  if (/병원|의원|clinic|약국/.test(v)) return "hospital";
  if (/인쇄|print|명함|간판/.test(v)) return "print";
  return "default";
}

/**
 * 업종별 「템퍼는 가구처럼, 꽃집은 꽃집처럼」 서명 힌트
 * @param {{ industry?: string, brandName?: string }} input
 */
export function buildIndustrySignatureBrief(input = {}) {
  if (!isSignatureWritingEnforced()) return "";
  const key = resolveIndustryFlavorKey(input.industry);
  const flavor =
    key === "print"
      ? {
          label: "인쇄·간판",
          spaceWord: "작업장·매장",
          productWord: "인쇄물·시공·납기",
          visitReason: "견적·시안·납품",
        }
      : getIndustryFlavor(key);
  const label = String(input.industry || flavor.label || "로컬 매장").trim();
  const brand = String(input.brandName || "").trim();
  return [
    `【업종 서명 · ${label}】`,
    `${label} 글은 ${label} 현장 톤으로 — 공간(${flavor.spaceWord})·대표(${flavor.productWord})·방문 이유(${flavor.visitReason}).`,
    "다른 업종 문장·템플릿 톤을 섞지 말 것.",
    brand ? `${brand}는 '왜' 이후 비교·선택 단계에서 등장.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildSignatureWritingCorePromptBlock() {
  return [
    SIGNATURE_WRITING_CORE,
    buildHumanStoryEnginePromptBlock(),
    SIGNATURE_WHY_FIRST,
    SIGNATURE_MOTION_BED_EXAMPLE,
    SIGNATURE_FLOW_BRIEF,
    SIGNATURE_FORBIDDEN_START,
    `【소제목 금지】 ${SIGNATURE_FORBIDDEN_HEADING_PHRASES.join(" · ")}`,
    SIGNATURE_ALLOWED_FOCUS,
    SIGNATURE_VOICE_RULE,
    SIGNATURE_PRODUCT_IDENTITY,
    SIGNATURE_SUCCESS_METRIC,
    SIGNATURE_AGENT_LAYER_NOTE,
  ].join("\n\n");
}

export function buildSignatureWritingPromptBlock(input = {}) {
  const industryBrief = buildIndustrySignatureBrief(input);
  return [buildSignatureWritingCorePromptBlock(), industryBrief]
    .filter(Boolean)
    .join("\n\n");
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * @param {string} text
 * @param {{ brandName?: string }} [input]
 */
export function isSignatureForbiddenOpening(text, input = {}) {
  if (!isSignatureWritingEnforced()) return false;
  const sample = String(text || "").trim().slice(0, 280);
  if (!sample) return false;
  if (SIGNATURE_FORBIDDEN_OPENING_RES.some((re) => re.test(sample))) return true;
  if (isHumanStoryProductFirstOpening(sample, input)) return true;
  const brand = String(input.brandName || "").trim();
  if (brand.length >= 2) {
    const re = new RegExp(`^${escapeRegExp(brand)}(?:은|는|의|,)`, "i");
    if (re.test(sample)) return true;
  }
  return false;
}

export function isSignatureForbiddenHeading(heading) {
  if (!isSignatureWritingEnforced()) return false;
  const h = String(heading || "").trim();
  if (!h) return false;
  return SIGNATURE_FORBIDDEN_HEADING_PHRASES.some((p) => h.includes(p));
}

/**
 * @param {string} heading
 * @param {{ brandName?: string, topic?: string }} [ctx]
 */
function signatureTopicLabel(ctx = {}) {
  const facet = topicWritingFacet(ctx) || String(ctx.topic || ctx.mainKeyword || "").trim();
  return String(facet || "")
    .replace(/\s*관련\s*$/i, "")
    .trim();
}

const CHECKLIST_WHY_HEADING_RE =
  /찾게\s*되는가|찾게\s*되었는가|^왜\s+.+\s*찾게/;

/** 가이드·체크리스트 톤 없는 자연 소제목 */
export function buildNaturalConcernHeading(ctx = {}) {
  const topic = signatureTopicLabel(ctx);
  const brand = String(ctx.brandName || "").trim();
  const region = String(ctx.region || "").trim();
  if (brand && topic) {
    return region
      ? `${region} ${brand}, ${topic} 볼 때 짚을 점`
      : `${brand}에서 ${topic} 볼 때 짚을 점`;
  }
  if (topic) return `${topic}를 고를 때 막히는 지점`;
  return "비교할 때 막히는 지점";
}

export function rewriteSignatureHeading(heading, ctx = {}) {
  const h = String(heading || "").trim();
  if (!h) return h;
  if (CHECKLIST_WHY_HEADING_RE.test(h)) {
    return buildNaturalConcernHeading(ctx);
  }
  for (const [bad, good] of Object.entries(SIGNATURE_HEADING_REWRITES)) {
    if (h.includes(bad)) return good;
  }
  if (isSignatureForbiddenHeading(h)) {
    return buildNaturalConcernHeading(ctx);
  }
  return h;
}

export function buildSignatureWhyHeading(ctx = {}) {
  return buildNaturalConcernHeading(ctx);
}
