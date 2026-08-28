/**
 * 상세페이지 공개 입력 길이·프리셋만 허용
 */
import {
  DETAIL_PAGE_COMPANY_PRESETS,
  DETAIL_PAGE_OPEN_EXAMPLES,
} from "@/lib/product/detailPageCompanyPresets";

const KNOWN_PRESET_IDS = new Set(
  [...DETAIL_PAGE_COMPANY_PRESETS, ...DETAIL_PAGE_OPEN_EXAMPLES].map((p) => p.id)
);

function clip(value, max) {
  return String(value || "").slice(0, max).trim();
}

export function sanitizePublicDetailPageBody(body = {}) {
  const pageLength = ["short", "standard", "long"].includes(body.pageLength)
    ? body.pageLength
    : "standard";
  const accent = /^#[0-9a-f]{6}$/i.test(String(body.accent || ""))
    ? String(body.accent)
    : "";
  const presetId = KNOWN_PRESET_IDS.has(String(body.presetId || ""))
    ? String(body.presetId)
    : "";

  return {
    productName: clip(body.productName || body.topic, 80),
    brandName: clip(body.brandName, 40),
    target: clip(body.target, 80),
    searchIntent: clip(body.searchIntent, 160),
    features: clip(body.features, 800),
    highlights: clip(body.highlights, 400),
    mustInclude: clip(body.mustInclude || body.extraCopy, 600),
    photoCaptions: Array.isArray(body.photoCaptions)
      ? body.photoCaptions.map((c) => clip(c, 80)).filter(Boolean).slice(0, 8)
      : clip(body.photoCaptions, 400),
    imageCount: Math.min(8, Math.max(0, Number(body.imageCount) || 0)),
    pageLength,
    accent,
    region: clip(body.region, 40),
    industry: clip(body.industry, 40),
    brandDescription: clip(body.brandDescription, 400),
    presetId,
  };
}
