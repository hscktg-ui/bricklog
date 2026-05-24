import { resolveContentIntent, buildIntentDrivenTitles } from "@/lib/quality/contentQualityRoot";
import { buildNaturalTitles } from "./blogNatural";
import { scrubMechanicalSeoPhrases } from "@/lib/keywords/naturalKeywordWeave";

/**
 * 주제·맥락 우선 제목 — 업종 템플릿보다 intent 기반
 */
export function buildContextFirstTitles(ctx, flavor) {
  const intent = resolveContentIntent(ctx);
  const intentTitles = buildIntentDrivenTitles(ctx, intent);
  const fallback = buildNaturalTitles(ctx, flavor);

  const merged = [];
  for (const t of intentTitles) {
    if (t && !merged.includes(t)) merged.push(scrubMechanicalSeoPhrases(t));
  }
  for (const t of fallback) {
    const clean = scrubMechanicalSeoPhrases(t);
    if (clean && !merged.includes(clean) && merged.length < 5) merged.push(clean);
  }

  while (merged.length < 3 && fallback[merged.length]) {
    merged.push(scrubMechanicalSeoPhrases(fallback[merged.length]));
  }

  return {
    titles: merged.slice(0, 5),
    intent,
    ok: intent.ok,
  };
}
