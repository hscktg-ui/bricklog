import { loadAllRules, saveEvolvedRules } from "@/lib/evolution-lab/rulesStore";
import { topSmellList } from "@/lib/evolution-lab/aiSmellTracker";

/**
 * 실험 결과·AI 냄새 통계로 규칙 JSON 자동 보정
 */
export function evolveRulesFromRun(run) {
  const rules = loadAllRules();
  const topSmells = topSmellList(run.smellStats, 10);
  const topErrors = Object.entries(run.errorCounts || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const forbidden = new Set(rules.prompt.forbiddenPhrases || []);
  if (topSmells.find((s) => s.id === "ai_cliche")) {
    forbidden.add("소중한 순간");
    forbidden.add("특별한 경험");
    forbidden.add("감동을 선사");
  }

  const naverHints = [...(rules.quality.naverBlogHints || [])];
  if (topSmells.find((s) => s.id === "weak_search_intent")) {
    naverHints.push("본문 중간에 위치·이용·비교 중 1블록 필수");
  }
  if (topSmells.find((s) => s.id === "no_scene" || s.id === "weak_emotion")) {
    naverHints.push("도입 3문장 안에 구체 장면(시간·장소) 필수");
  }

  const rewriteHints = { ...(rules.prompt.rewriteHints || {}) };
  for (const e of topErrors.slice(0, 5)) {
    const hint =
      rules.prompt.rewriteHints?.[e[0]] ||
      `${e[0]} 문제 — 구체 장면과 브랜드명으로 보완`;
    rewriteHints[e[0]] = hint;
  }

  const partial = {
    "quality_rules.json": {
      naverBlogHints: [...new Set(naverHints)].slice(0, 12),
      minTotalScore: rules.quality.minTotalScore ?? 90,
    },
    "prompt_rules.json": {
      forbiddenPhrases: [...forbidden].slice(0, 20),
      rewriteHints,
    },
    "persona_rules.json": {
      consistencyChecks: [
        ...(rules.persona.consistencyChecks || []),
        "no_sales_shift_mid",
      ],
    },
    "emotion_rules.json": {
      temperatureFloor: Math.min(
        (rules.emotion.temperatureFloor ?? 0.35) + 0.02,
        0.5
      ),
    },
  };

  saveEvolvedRules(partial);

  return {
    evolvedAt: new Date().toISOString(),
    topSmells,
    topErrors: topErrors.map(([reason, count]) => ({ reason, count })),
    promptChanges: partial["prompt_rules.json"].forbiddenPhrases.length,
  };
}
