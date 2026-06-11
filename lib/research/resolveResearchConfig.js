/**
 * ResearchModePanel → 파이프라인 조사 쿼리·유형 SSOT
 * UI에서 사용자가 고른 연구 주제·조사 유형이 실제 조사에 반영되도록 한다.
 */
import {
  buildDefaultResearchQuery,
  defaultAutoResearchTypes,
} from "@/lib/research/needsOnlineResearch";
import { normalizeResearchTypes } from "@/lib/research/types";

/**
 * @param {Record<string, unknown>} input
 */
export function resolveResearchQueryAndTypes(input = {}) {
  const customQuery = String(input.researchQuery || "").trim();
  const autoQuery = buildDefaultResearchQuery(input);
  const query = customQuery || autoQuery;

  const userTypes = normalizeResearchTypes(input.researchTypes);
  const types = userTypes.length > 0 ? userTypes : defaultAutoResearchTypes(input);

  return {
    query,
    types,
    querySource: customQuery ? "user" : "auto",
    typesSource: userTypes.length > 0 ? "user" : "auto",
    researchPanelEnabled: input.researchEnabled !== false,
  };
}
