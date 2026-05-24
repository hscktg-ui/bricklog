import { detectGptTone } from "@/utils/gptToneScrubber";

export function detectGPTTone(text) {
  const r = detectGptTone(text);
  const risk = Math.min(99, r.hits.length * 18 + (r.hasGptTone ? 25 : 0));
  return {
    hasGptTone: r.hasGptTone,
    hits: r.hits,
    riskPercent: risk,
    score: Math.max(0, 100 - risk),
  };
}
