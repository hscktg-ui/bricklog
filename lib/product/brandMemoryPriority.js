/**
 * BRICLOG BRAND MEMORY PRIORITY — 연속된 브랜드 이야기 SSOT
 */

import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";

export const BRAND_MEMORY_PRIORITY_VERSION = "v1";

export const BRAND_MEMORY_PRIORITY_CORE = `【BRICLOG BRAND MEMORY PRIORITY】
브릭로그는 새 글을 쓰지 않는다. 기존 브랜드의 연속된 이야기를 쓴다.`;

export const BRAND_MEMORY_PRE_WRITE_SOURCES = `작성 전 우선 조회:
브랜드 메모리 · 과거 콘텐츠 · 운영자 피드백 · 승인 콘텐츠`;

export const BRAND_MEMORY_CONTINUITY = `새 콘텐츠는 기존 콘텐츠의 다음 장이어야 한다.`;

export const BRAND_MEMORY_FORBIDDEN = `【금지】
매번 처음 소개하는 브랜드 · 매번 처음 설명하는 서비스 · 매번 같은 브랜드 소개`;

export const BRAND_MEMORY_ALLOWED = `【허용】
지난 콘텐츠 확장 · 새로운 관점 추가 · 새로운 고객 질문 해결 · 새로운 상황 설명`;

export const BRAND_MEMORY_READER_ASSUMPTION = `독자는 브랜드를 처음 보는 사람이 아니라
이미 브랜드를 여러 번 접한 사람으로 가정한다.`;

/** 고객 UI용 한 줄 */
export const BRAND_MEMORY_CUSTOMER_HINT =
  "이전 글·피드백·승인본을 바탕으로 이어 씁니다.";

export function isBrandMemoryPriorityEnforced() {
  return isBriclogMissionEnforced();
}

export function buildBrandMemoryPriorityPromptBlock() {
  return [
    BRAND_MEMORY_PRIORITY_CORE,
    BRAND_MEMORY_PRE_WRITE_SOURCES,
    BRAND_MEMORY_CONTINUITY,
    BRAND_MEMORY_FORBIDDEN,
    BRAND_MEMORY_ALLOWED,
    BRAND_MEMORY_READER_ASSUMPTION,
  ].join("\n\n");
}

/** buildBrandMemoryUserSection 상단 안내 */
export function buildBrandMemoryPriorityUserHint() {
  if (!isBrandMemoryPriorityEnforced()) return "";
  return `【브랜드 연속성】${BRAND_MEMORY_CONTINUITY} ${BRAND_MEMORY_READER_ASSUMPTION.replace(/\n/g, " ")}`;
}
