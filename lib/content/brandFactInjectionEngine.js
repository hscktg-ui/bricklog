/**
 * 브랜드 정보 강제 주입 — storeFeatures·지역·차별점 본문 반영 SSOT
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { collectMergedResearchFacts } from "@/lib/product/researchReadiness";
import { assessBrandFactPresence } from "@/lib/product/briclogResetQualityGate";

export const BRAND_FACT_INJECTION_VERSION = "brand-inject-v1";
export const BRAND_FACT_MIN_HITS = 3;

function collectBrandFactTokens(input = {}) {
  const blobs = [
    input.storeFeatures,
    input.brandDescription,
    input.includePhrases,
    input.brandMemory?.storeFeatures,
    input.brandMemory?.brandDescription,
    ...(collectMergedResearchFacts(input) || []).map((f) => f.fact || f.text || f),
  ]
    .filter(Boolean)
    .join(" · ");

  const tokens = [];
  const brand = String(input.brandName || "").trim();
  if (brand.length >= 2) tokens.push(brand);

  const region = String(input.region || "").trim();
  if (region.length >= 2 && region !== "전국") tokens.push(region);

  for (const part of blobs.split(/[,，·|/\n]+/)) {
    const t = part.trim();
    if (t.length >= 2 && t.length <= 28 && !tokens.includes(t)) tokens.push(t);
  }

  return tokens.slice(0, 8);
}

function weaveFactLine(fact, brand, region) {
  const f = String(fact || "").trim();
  if (!f) return "";
  if (brand && region) {
    return `${region} ${brand} — ${f}`.replace(/\s+/g, " ").trim();
  }
  if (brand) return `${brand} — ${f}`;
  return f;
}

/**
 * 본문에 브랜드 팩트가 부족하면 기존 섹션에 자연 문장으로 삽입 (재생성 없음)
 */
export function injectBrandFactsIntoPack(pack, input = {}, opts = {}) {
  if (!pack?.sections?.length) return pack;
  const minHits = opts.minHits ?? BRAND_FACT_MIN_HITS;
  const probe = assessBrandFactPresence(pack, input);
  if (probe.ok || probe.available < 1) return pack;

  const tokens = collectBrandFactTokens(input);
  const full = getBlogFullText(pack);
  const missing = tokens.filter((t) => !full.includes(t));
  if (!missing.length) return pack;

  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  const lines = missing
    .slice(0, Math.max(minHits - probe.hits.length, 1))
    .map((t) => weaveFactLine(t, brand, region))
    .filter(Boolean);

  const sections = [...pack.sections];
  for (let i = 0; i < lines.length; i += 1) {
    const idx = i % sections.length;
    const line = lines[i];
    const body = String(sections[idx]?.body || "").trim();
    if (body.includes(line.slice(0, 8))) continue;
    sections[idx] = {
      ...sections[idx],
      body: body ? `${body}\n\n${line}` : line,
    };
  }

  return {
    ...pack,
    sections,
    _meta: {
      ...(pack._meta || {}),
      brandFactInjection: {
        version: BRAND_FACT_INJECTION_VERSION,
        injected: lines,
        beforeHits: probe.hits.length,
        required: minHits,
      },
    },
  };
}
