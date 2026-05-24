import { hasDuplicateSentences } from "@/utils/repetitionGuard";

export function detectRepeatedSentences(text, minLen = 14) {
  const sentences = String(text || "")
    .split(/[.!?]\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= minLen);
  const seen = new Map();
  const repeats = [];
  for (const s of sentences) {
    const key = s.toLowerCase().replace(/\s/g, "");
    if (seen.has(key)) repeats.push(s.slice(0, 48));
    else seen.set(key, 1);
  }
  return {
    hasRepeat: hasDuplicateSentences(text, minLen) || repeats.length > 0,
    repeats: [...new Set(repeats)].slice(0, 3),
  };
}
