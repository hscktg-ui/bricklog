/**
 * global_quality_insights 승인 → evolution-lab 규칙 파일 반영
 */
import { loadRuleSet, saveEvolvedRules } from "@/lib/evolution-lab/rulesStore";

const RULE_FILES = {
  quality: "quality_rules.json",
  prompt: "prompt_rules.json",
};

function mergeUniqueStrings(base = [], extra = []) {
  return [...new Set([...base, ...extra].filter(Boolean))];
}

function mergeRuleFile(name, patch = {}) {
  const current = loadRuleSet(name);
  const next = { ...current, ...patch };
  if (patch.forbiddenPhrases) {
    next.forbiddenPhrases = mergeUniqueStrings(
      current.forbiddenPhrases,
      patch.forbiddenPhrases
    );
  }
  if (patch.naverBlogHints) {
    next.naverBlogHints = mergeUniqueStrings(
      current.naverBlogHints,
      patch.naverBlogHints
    );
  }
  if (patch.evolutionNotes) {
    next.evolutionNotes = mergeUniqueStrings(
      current.evolutionNotes,
      patch.evolutionNotes
    );
  }
  return next;
}

/**
 * @param {{ insight_type: string, payload?: object }} insight
 */
export function buildEvolutionPatchFromInsight(insight = {}) {
  const type = insight.insight_type || "";
  const payload = insight.payload || {};
  const note = payload.message || type;

  switch (type) {
    case "ai_cliche_threshold":
      return {
        [RULE_FILES.prompt]: mergeRuleFile(RULE_FILES.prompt, {
          forbiddenPhrases: [
            "AI가 쓴 것 같",
            "GPT 톤",
            "한결같은 문장",
          ],
          evolutionNotes: [note],
        }),
        [RULE_FILES.quality]: mergeRuleFile(RULE_FILES.quality, {
          naverBlogHints: [
            "AI/GPT 톤 지적 다수 — 관용구·나열형 문장 금지 (피드백 집계)",
          ],
          evolutionNotes: [note],
        }),
      };
    case "ad_tone_guard":
      return {
        [RULE_FILES.prompt]: mergeRuleFile(RULE_FILES.prompt, {
          forbiddenPhrases: ["압도적", "지금 바로", "놓치지 마세요", "최고의 선택"],
          evolutionNotes: [note],
        }),
        [RULE_FILES.quality]: mergeRuleFile(RULE_FILES.quality, {
          naverBlogHints: ["과장·명령형·광고 톤 금지 (피드백 집계)"],
          evolutionNotes: [note],
        }),
      };
    case "negative_feedback_rate":
      return {
        [RULE_FILES.quality]: mergeRuleFile(RULE_FILES.quality, {
          minTotalScore: Math.min(95, (loadRuleSet(RULE_FILES.quality).minTotalScore || 90) + 1),
          evolutionNotes: [note],
        }),
      };
    case "rewrite_vs_copy":
      return {
        [RULE_FILES.quality]: mergeRuleFile(RULE_FILES.quality, {
          naverBlogHints: [
            "초안 품질: 재작성 요청 다수 — 장면·현장 1문단 이상 필수",
          ],
          evolutionNotes: [note],
        }),
        [RULE_FILES.prompt]: mergeRuleFile(RULE_FILES.prompt, {
          evolutionNotes: [note],
        }),
      };
    default:
      return null;
  }
}

/**
 * @param {{ insight_type: string, payload?: object }} insight
 */
export function applyInsightToEvolutionRules(insight = {}) {
  const patch = buildEvolutionPatchFromInsight(insight);
  if (!patch) {
    return { applied: false, reason: "unsupported_insight_type" };
  }

  const partial = {};
  for (const [file, rules] of Object.entries(patch)) {
    partial[file] = rules;
  }
  saveEvolvedRules(partial);

  return {
    applied: true,
    insightType: insight.insight_type,
    files: Object.keys(partial),
  };
}
