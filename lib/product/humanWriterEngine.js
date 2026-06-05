/**
 * BRICLOG HUMAN WRITER ENGINE — 작성 SSOT
 * 조사는 재료. Reader First · Brand Second · SEO Third.
 */

import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";

export const HUMAN_WRITER_ENGINE_VERSION = "v20";

export const HUMAN_WRITER_CORE = `【BRICLOG HUMAN WRITER ENGINE】
조사 결과를 직접 출력하지 않는다.
조사 결과는 글을 쓰기 위한 재료다.`;

/** 본문 소제목·섹션 제목으로 사용 금지 */
export const HUMAN_WRITER_FORBIDDEN_HEADING_PHRASES = [
  "브랜드 이해",
  "제품군",
  "라인업",
  "가격 비교 포인트",
  "행사 기간",
  "설치 안내",
  "AS 안내",
  "A/S 안내",
  "체크리스트",
  "FAQ",
  "자주 묻는 질문",
  "보고서",
  "제품 소개서",
  "브로슈어",
  "설명서",
];

/** 금지 소제목 → 독자 검색 이유·장면형 대체 (부분 일치 시 적용) */
export const HUMAN_WRITER_HEADING_REWRITES = {
  "브랜드 이해": "왜 지금 이 주제를 찾게 되는가",
  "제품군": "어떤 선택지가 헷갈리는지",
  "라인업": "어떤 모델·옵션을 비교하는지",
  "가격 비교 포인트": "가격·혜택을 볼 때 막히는 지점",
  "행사 기간": "지금 확인해야 할 시점·조건",
  "설치 안내": "배송·설치 전에 알아두면 좋은 점",
  "AS 안내": "사후 관리·문의 전에 볼 것",
  "A/S 안내": "사후 관리·문의 전에 볼 것",
  "체크리스트": "방문·구매 전에 짚어볼 것",
  "FAQ": "독자가 실제로 궁금해하는 것",
  "자주 묻는 질문": "독자가 실제로 궁금해하는 것",
  "보고서": "현장에서 확인한 내용",
  "제품 소개서": "직접 확인한 특징",
  "브로슈어": "매장·현장에서 본 점",
  "설명서": "쓰기 전에 알아야 할 맥락",
};

export const HUMAN_WRITER_SEARCH_FIRST = `모든 글은 사람이 실제 검색하는 이유로 시작한다.
제품·기능·「제공합니다」「판매합니다」로 도입하지 말고, 독자의 상황·고민으로 시작한다.

예시 흐름 (모션베드):
허리가 먼저 아픈 아침 → 왜 침대를 바꾸려 하는가 → 템퍼에서 확인한 점 → 방문 전 체크포인트`;

export const HUMAN_WRITER_PRIORITY = `Reader First · Brand Second · SEO Third
브릭로그는 검색엔진용 글이 아니라 사람이 읽는 글을 먼저 만든다.`;

export const HUMAN_WRITER_GENRE = `글을 읽었을 때 블로그·칼럼·후기에 가까워야 하며,
설명서·브로슈어·제품 소개서·FAQ가 되어서는 안 된다.

같은 정보를 다른 문장으로 반복하지 말 것. 「확인하세요」만 바꾼 문장 나열 금지.
독자는 「글자수가 많다」가 아니라 「읽을 정보가 많다」고 느껴야 한다.`;

export const HUMAN_WRITER_FORBIDDEN_BLOCK = `【소제목 금지 — 본문 제목으로 사용 불가】
${HUMAN_WRITER_FORBIDDEN_HEADING_PHRASES.join(" · ")}`;

export function buildHumanWriterEnginePromptBlock() {
  return [
    HUMAN_WRITER_CORE,
    HUMAN_WRITER_FORBIDDEN_BLOCK,
    HUMAN_WRITER_SEARCH_FIRST,
    HUMAN_WRITER_PRIORITY,
    HUMAN_WRITER_GENRE,
  ].join("\n\n");
}

export function isHumanWriterEngineEnforced() {
  return isBriclogMissionEnforced();
}

/**
 * @param {string} heading
 */
export function isHumanWriterForbiddenHeading(heading) {
  if (!isHumanWriterEngineEnforced()) return false;
  const h = String(heading || "").trim();
  if (!h) return false;
  return HUMAN_WRITER_FORBIDDEN_HEADING_PHRASES.some((p) => h.includes(p));
}

/**
 * @param {string} heading
 * @param {{ brandName?: string, topic?: string }} [ctx]
 */
export function rewriteHumanWriterHeading(heading, ctx = {}) {
  const h = String(heading || "").trim();
  if (!h) return h;
  for (const [bad, good] of Object.entries(HUMAN_WRITER_HEADING_REWRITES)) {
    if (h.includes(bad)) return good;
  }
  const brand = String(ctx.brandName || "").trim();
  const topic = String(ctx.topic || ctx.mainKeyword || "").trim();
  if (brand && topic) return `${brand}에서 ${topic} 볼 때 짚을 점`;
  if (topic) return `${topic}를 찾게 된 이유`;
  return "독자가 실제로 궁금해하는 지점";
}
