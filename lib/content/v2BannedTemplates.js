/** 이전 업종·템플릿 오염 문구 — V2/V3 생성 금지 */
import {
  V3_INDUSTRY_DRIFT_PHRASES,
  V3_AI_CONTAMINATION_PHRASES,
} from "@/lib/content/v3/constants";

export const V2_BANNED_TEMPLATE_PHRASES = [
  ...new Set([
    "기념일을 깜빡했다는 걸",
    "기념일을 깜빡했다",
    "테이블 위가 비어보이는 날",
    "테이블 위",
    "꽃 한 다발",
    "카페 감성",
    "꽃집 예시",
    "플라워샵",
    "생화 예약",
    "다녀온 뒤 느낀 점",
    "반려견",
    "검색하시는 분",
    "저장해두세요",
    ...V3_INDUSTRY_DRIFT_PHRASES,
    ...V3_AI_CONTAMINATION_PHRASES,
  ]),
];

export function findBannedTemplateHits(text) {
  const full = String(text || "");
  return V2_BANNED_TEMPLATE_PHRASES.filter((p) => full.includes(p));
}
