/**
 * BRICLOG RESEARCH FIRST V2 — 조사 우선, 글쓰기 후순위
 * Research First · Writing Second · Quality Third
 */
import { isBriclogResetQualityEnforced } from "@/lib/config/resetLaunchFlags";

export const RESEARCH_FIRST_VERSION = "research-first-v2";

/** 조사 없이 글 생성 금지 */
export function isBriclogResearchFirstEnforced() {
  if (process.env.BRICLOG_RESEARCH_FIRST === "false") return false;
  if (process.env.BRICLOG_RESEARCH_FIRST === "true") return true;
  return isBriclogResetQualityEnforced();
}

export const RESEARCH_FIRST_WITHHOLD_MESSAGE =
  "조사가 아직 충분하지 않아 글을 쓰지 않았어요. 브랜드·지역·주제를 조금 더 구체적으로 적어 주시거나, 잠시 후 다시 시도해 주세요.";

export const RESEARCH_FIRST_BRAND_MISSING_MESSAGE =
  "브랜드 정보가 없어 조사를 시작할 수 없어요. 매장 특징·운영 방식을 입력해 주세요.";

export const RESEARCH_FIRST_INDUSTRY_GAP_MESSAGE =
  "업종에 필요한 조사 항목이 부족해요. 꽃 이름·메뉴·체험 포인트 등 구체 정보를 확인한 뒤 다시 시도해 주세요.";
