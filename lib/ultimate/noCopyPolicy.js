/**
 * STEP 3 — No Copy Policy
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { SOURCE_CITATION_BANS } from "@/lib/research/reinterpret";

export function detectNoCopyViolations(pack, brandResearch = null) {
  const full = getBlogFullText(pack);
  const violations = [];

  for (const ban of SOURCE_CITATION_BANS) {
    if (full.includes(ban)) violations.push({ type: "citation", text: ban });
  }

  const signals = brandResearch?.collection?.signals || [];
  for (const sig of signals) {
    const s = String(sig || "").trim();
    if (s.length >= 20 && full.includes(s.slice(0, Math.min(40, s.length)))) {
      violations.push({ type: "signal_copy", text: s.slice(0, 30) });
    }
  }

  const voices = brandResearch?.searchVoices || [];
  for (const v of voices) {
    if (v.length >= 25 && full.includes(v)) {
      violations.push({ type: "voice_copy", text: v.slice(0, 30) });
    }
  }

  return {
    ok: violations.length === 0,
    violations,
  };
}
