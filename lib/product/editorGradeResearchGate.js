/**
 * A등급(30년차 편집) 조사 SSOT — 메타·표기 변형 제외, 구체 팩트만 글쓰기 허용
 */
import { isBriclogResetQualityEnforced } from "@/lib/config/resetLaunchFlags";
import {
  isPollutedResearchFactText,
  injectBrandContextResearchFacts,
} from "@/lib/content/researchFactSanitize";
import {
  hasConcreteFactSignal,
  isMetaOnlyResearchFact,
} from "@/lib/content/researchFactMetaFilter";

export const EDITOR_GRADE_RESEARCH_VERSION = "editor-grade-research-v1";
export const MIN_SUBSTANTIVE_FACTS_A = 3;
export const MIN_SUBSTANTIVE_FACTS_SOFT = 2;

function factText(row) {
  return String(typeof row === "string" ? row : row?.fact || row?.text || "").trim();
}

function factSource(row) {
  return typeof row === "object" ? row?.source || "" : "";
}

export { isMetaOnlyResearchFact, hasConcreteFactSignal };

export function isSubstantiveResearchFact(row, input = {}) {
  const text = factText(row);
  const source = factSource(row);
  if (!text || text.length < 8) return false;
  if (isMetaOnlyResearchFact(text, input, source)) return false;
  if (isPollutedResearchFactText(text, input, source)) return false;
  return hasConcreteFactSignal(text);
}

export function collectSubstantiveResearchFacts(input = {}) {
  const enriched = {
    ...input,
    researchFacts: injectBrandContextResearchFacts(input),
  };
  return enriched.researchFacts.filter((f) => isSubstantiveResearchFact(f, input));
}

function hasRichInputClues(input = {}) {
  return Boolean(
    String(input.storeFeatures || "").trim().length >= 8 ||
      String(input.includePhrases || "").trim().length >= 8 ||
      String(input.brandDescription || "").trim().length >= 24
  );
}

export function resolveMinSubstantiveFacts(input = {}) {
  if (hasRichInputClues(input)) return MIN_SUBSTANTIVE_FACTS_SOFT;
  if (isBriclogResetQualityEnforced()) return MIN_SUBSTANTIVE_FACTS_A;
  return MIN_SUBSTANTIVE_FACTS_SOFT;
}

export function evaluateEditorGradeResearchGate(input = {}) {
  const substantive = collectSubstantiveResearchFacts(input);
  const minRequired = resolveMinSubstantiveFacts(input);
  const count = substantive.length;

  if (count >= minRequired) {
    return { ok: true, substantiveCount: count, minRequired, userMessage: null, facts: substantive };
  }

  return {
    ok: false,
    substantiveCount: count,
    minRequired,
    facts: substantive,
    userMessage: hasRichInputClues(input)
      ? `현장 포인트를 조금 더 구체적으로 적어 주세요. (현재 ${count}/${minRequired}개) 매장·서비스 특징 한 줄(가격·혜택·시설)을 추가하면 바로 이어갈 수 있어요.`
      : `브랜드·지역·주제만으로는 조사 팩트가 부족해요. (현재 ${count}/${minRequired}개) 생성 직전 안내에서 현장 포인트 한 줄을 골라 주세요.`,
  };
}

export function formatSubstantiveResearchFactsForPrompt(input = {}, max = 18) {
  const facts = collectSubstantiveResearchFacts(input);
  if (!facts.length) return "";
  return facts
    .slice(0, max)
    .map((f, i) => `${i + 1}. ${factText(f)}`)
    .join("\n");
}

export function countConcreteFactsWovenInBody(full = "", input = {}) {
  const facts = collectSubstantiveResearchFacts(input);
  if (!facts.length) return { woven: 0, total: 0, ratio: 0 };
  let woven = 0;
  for (const row of facts) {
    const text = factText(row);
    const tokens = text
      .replace(/[^\uAC00-\uD7A3a-zA-Z0-9\s·]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 2)
      .slice(0, 5);
    if (tokens.some((t) => full.includes(t))) woven += 1;
  }
  return {
    woven,
    total: facts.length,
    ratio: facts.length ? woven / facts.length : 0,
  };
}
