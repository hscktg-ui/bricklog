/**
 * BRICLOG Mission — 고객 UI 라벨·힌트 (SSOT: briclogMission.js)
 */
import { BLOG_LENGTH_TIER_OPTIONS } from "@/lib/constants";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";

const MISSION_LENGTH_HINTS = {
  short: "참고 · 짧게 · 정보 우선",
  medium: "참고 · 보통 · 정보 우선",
  long: "참고 · 길게 · 정보 우선",
};

/** 폼 분량 칩 — Mission ON 시 목표 글자수 대신 참고 분량 */
export function getBlogLengthTierOptionsForUi() {
  if (!isBriclogMissionEnforced()) return BLOG_LENGTH_TIER_OPTIONS;
  return BLOG_LENGTH_TIER_OPTIONS.map((o) => ({
    ...o,
    hint: MISSION_LENGTH_HINTS[o.value] || "참고 분량 · 정보 우선",
  }));
}

export function getBlogLengthFieldLabel() {
  return isBriclogMissionEnforced() ? "참고 분량" : "글 분량";
}

/** V3 품질 축 — SEO 목표가 아닌 자연스러움 */
export const V3_SEARCH_AXIS_LABEL = "검색 자연스러움";

/** 로딩 단계 — SEO 전략 대신 정보 구조 */
export const MISSION_INFO_STRUCTURE_STEP = "주제·정보 구조 정리 중…";
