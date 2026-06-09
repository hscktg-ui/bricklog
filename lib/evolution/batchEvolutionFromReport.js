/**
 * 배치 품질 리포트 → 자동 진화 규칙 반영 (로컬·야간)
 */
import { loadRuleSet, saveEvolvedRules, refreshEvolutionRulesCache } from "@/lib/evolution-lab/rulesStore";
import { appendNightlyEvolutionEvent } from "@/lib/cron/nightlyEvolutionActivityLog";
import { isAutoEvolveFromFeedbackEnabled } from "@/lib/config/engineEvolutionFlags";

const FAIL_TO_BAN = {
  human_belief_low: ["알아보시다 보면", "이번 글에서는", "결론적으로 말하면"],
  checklist_voice: ["방문 전에", "비교할 때", "확인하세요", "체크 포인트"],
  topic_dominance_low: [],
  information_yield_low: ["목적에 따라 우선순위가", "기준이 분명해집니다"],
  duplicate_content: [],
  editor_verbatim_topic_dump: [],
  length_tier_under: [],
  meta_leak: ["지역명은 자연스럽게", "공식·매장 안내 기준"],
};

function mergeUnique(base = [], extra = []) {
  return [...new Set([...base, ...extra].filter(Boolean))];
}

/**
 * @param {{ failReasons?: Record<string, number>, passRate?: number, total?: number }} summary
 */
export function applyBatchEvolutionFromReport(summary = {}) {
  if (!isAutoEvolveFromFeedbackEnabled()) {
    return { ok: true, skipped: true, reason: "auto_evolve_off" };
  }

  const failReasons = summary.failReasons || {};
  const entries = Object.entries(failReasons).sort((a, b) => b[1] - a[1]);
  if (!entries.length) {
    return { ok: true, skipped: true, reason: "no_failures" };
  }

  const top = entries.slice(0, 8);
  const forbidden = [];
  const hints = [];
  for (const [reason, count] of top) {
    const bans = FAIL_TO_BAN[reason] || [];
    forbidden.push(...bans);
    hints.push(`${reason} (${count}건) — 배치 자동 진화`);
  }

  const quality = loadRuleSet("quality_rules.json");
  const prompt = loadRuleSet("prompt_rules.json");
  const nextQuality = {
    ...quality,
    naverBlogHints: mergeUnique(quality.naverBlogHints, hints),
    evolutionNotes: mergeUnique(quality.evolutionNotes, [
      `batch ${summary.startedAt || new Date().toISOString()} passRate=${summary.passRate}%`,
    ]),
  };
  const nextPrompt = {
    ...prompt,
    forbiddenPhrases: mergeUnique(prompt.forbiddenPhrases, forbidden),
    evolutionNotes: mergeUnique(prompt.evolutionNotes, hints.slice(0, 4)),
  };

  saveEvolvedRules("quality_rules.json", nextQuality);
  saveEvolvedRules("prompt_rules.json", nextPrompt);
  refreshEvolutionRulesCache(null).catch(() => {});

  appendNightlyEvolutionEvent("finished", "배치 테스트 결과를 반영해 규칙을 갱신했습니다.", {
    step: "batch_evolution",
    topFails: top.map(([r, n]) => `${r}:${n}`),
    passRate: summary.passRate,
  });

  return {
    ok: true,
    applied: true,
    topFails: top,
    forbiddenAdded: forbidden.length,
    hintsAdded: hints.length,
  };
}
