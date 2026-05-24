import { hasMechanicalKeywordPattern } from "@/lib/keywords/naturalKeywordWeave";
import { countKeywordOccurrences } from "@/lib/prompts/engine/textUtils";

export function detectKeywordStuffing(text, mainKeyword) {
  const main = (mainKeyword || "").trim();
  if (!main) return { stuffed: false, count: 0, riskPercent: 0 };
  const count = countKeywordOccurrences(text, main);
  const mechanical = hasMechanicalKeywordPattern(text);
  const stuffed = count > 9 || mechanical;
  const riskPercent = Math.min(
    99,
    Math.max(0, (count - 6) * 12 + (mechanical ? 30 : 0))
  );
  return { stuffed, count, mechanical, riskPercent, score: Math.max(0, 100 - riskPercent) };
}
