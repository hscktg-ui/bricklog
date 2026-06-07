/**
 * BRAND DNA ENGINE — 브랜드별 고유 문체 비율
 */
export const BRAND_DNA_VERSION = "v1";

export const DNA_TRAITS = [
  { id: "expertise", label: "전문성" },
  { id: "emotion", label: "감성" },
  { id: "practicality", label: "실용성" },
  { id: "trust", label: "신뢰성" },
  { id: "warmth", label: "친근함" },
  { id: "innovation", label: "혁신성" },
];

const DEFAULT_DNA = {
  expertise: 0.2,
  emotion: 0.15,
  practicality: 0.25,
  trust: 0.25,
  warmth: 0.1,
  innovation: 0.05,
};

const INDUSTRY_DNA_HINTS = {
  pet: { emotion: 0.22, warmth: 0.2, practicality: 0.2, trust: 0.2 },
  pet_cafe: { emotion: 0.2, warmth: 0.22, practicality: 0.18, trust: 0.2 },
  furniture: { expertise: 0.28, trust: 0.28, practicality: 0.22 },
  cafe: { warmth: 0.2, emotion: 0.18, practicality: 0.22 },
  marketing: { expertise: 0.3, innovation: 0.15, trust: 0.2 },
  hospital: { trust: 0.35, expertise: 0.3, practicality: 0.2 },
};

function normalizeRatios(ratios = {}) {
  const merged = { ...DEFAULT_DNA, ...ratios };
  const sum = DNA_TRAITS.reduce((s, t) => s + (merged[t.id] || 0), 0) || 1;
  const out = {};
  for (const t of DNA_TRAITS) out[t.id] = (merged[t.id] || 0) / sum;
  return out;
}

/**
 * @returns {{ version: string, ratios: Record<string, number>, traits: object[], brief: string }}
 */
export function resolveBrandDna(input = {}) {
  const mem = input.brandMemory || {};
  const industryKey =
    input.industryKey || input.industry || mem.industryKey || "default";
  const fromMemory = mem.brandDna || mem.dnaRatios || {};
  const fromIndustry = INDUSTRY_DNA_HINTS[industryKey] || {};
  const ratios = normalizeRatios({ ...fromIndustry, ...fromMemory });

  const traits = DNA_TRAITS.map((t) => ({
    ...t,
    ratio: Math.round((ratios[t.id] || 0) * 100),
  }));

  const brief = [
    "【브랜드 DNA · BRAND DNA】",
    "100개의 글을 읽어도 같은 브랜드처럼 보이게 — 비율 유지",
    traits.map((t) => `${t.label} ${t.ratio}%`).join(" · "),
  ].join("\n");

  return {
    version: BRAND_DNA_VERSION,
    ratios,
    traits,
    brief,
    industryKey,
  };
}

export function buildBrandDnaPromptBlock(input = {}) {
  return resolveBrandDna(input).brief;
}
