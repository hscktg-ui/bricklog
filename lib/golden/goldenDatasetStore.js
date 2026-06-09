/**
 * Golden Dataset Store — 클라이언트·서버 공통 (fs 없음)
 */
import { GOLDEN_SEED_SAMPLES } from "@/lib/golden/goldenSeedSamples";
import { resolveGoldenIndustryKey } from "@/lib/golden/goldenIndustryKeys";

function mergeSeedSamples(extra = []) {
  const map = new Map();
  for (const s of [...GOLDEN_SEED_SAMPLES, ...extra]) {
    if (!s?.content || !s?.industry) continue;
    if (s.sample_kind === "failure") continue;
    map.set(s.id || `${s.industry}:${s.title}`, { ...s, is_active: s.is_active !== false });
  }
  return [...map.values()].filter((s) => s.is_active !== false);
}

/** delivery·prompt용 — 시드 + input.goldenSamples (브라우저 안전) */
export function getGoldenSamplesForInput(input = {}, limit = 5) {
  const key = resolveGoldenIndustryKey(input);
  const extras = Array.isArray(input.goldenSamples) ? input.goldenSamples : [];
  return mergeSeedSamples(extras)
    .filter((s) => s.industry === key)
    .sort((a, b) => Number(b.brand_presence_score || 0) - Number(a.brand_presence_score || 0))
    .slice(0, limit);
}

export function listSeedGoldenSamples({ industry } = {}) {
  const all = mergeSeedSamples();
  const filtered = industry ? all.filter((s) => s.industry === industry) : all;
  return {
    ok: true,
    samples: filtered,
    total: filtered.length,
    industries: [...new Set(all.map((s) => s.industry))],
  };
}
