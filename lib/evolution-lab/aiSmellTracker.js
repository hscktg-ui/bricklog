import { getBlogFullText } from "@/utils/qualityCheck";
import {
  V4_AI_CLICHES,
  V4_PLACEHOLDER_RE,
  runV4CoreAudit,
} from "@/lib/quality/v4ContentAudit";
import { hasDuplicateSentences } from "@/utils/repetitionGuard";

const SMELL_KEYS = [
  "ai_cliche",
  "repetition",
  "placeholder",
  "persona_drift",
  "industry_mix",
  "region_mix",
  "weak_emotion",
  "weak_search_intent",
];

export function detectAiSmells(pack, ctx = {}) {
  const text = getBlogFullText(pack) || "";
  const smells = [];

  if (V4_PLACEHOLDER_RE.test(text)) smells.push("placeholder");

  let clicheCount = 0;
  for (const p of V4_AI_CLICHES) {
    if (text.includes(p)) clicheCount += 1;
  }
  if (clicheCount >= 2) smells.push("ai_cliche");

  if (hasDuplicateSentences(text)) smells.push("repetition");

  const core = runV4CoreAudit(pack, ctx);
  if (core.blockers.includes("duplicate")) smells.push("repetition");
  if (core.humanityScore < 60) smells.push("persona_drift");
  if (core.humanityScore < 55) smells.push("weak_emotion");
  if (core.searchIntentScore < 45) smells.push("weak_search_intent");

  return [...new Set(smells)];
}

export function mergeSmellStats(runStats, smells) {
  const stats = { ...(runStats || {}) };
  for (const s of smells) {
    if (!SMELL_KEYS.includes(s) && !s) continue;
    stats[s] = (stats[s] || 0) + 1;
  }
  return stats;
}

export function topSmellList(stats, limit = 10) {
  return Object.entries(stats || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, count]) => ({ id, count }));
}
