/**
 * Region + Brand mash repair — 「근처목마」「현장 현장목마」 등 SEO 치환 부작용 SSOT
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { getChannelFullText } from "@/lib/content/channelPack";
import { ANTI_SEO_SPAM_PRONOUNS } from "@/lib/product/antiSeoSpamEngine";

export const REGION_BRAND_MASH_VERSION = "region-brand-mash-v1";

const REGION_PRONOUNS = [...ANTI_SEO_SPAM_PRONOUNS.region, "근처", "이 지역", "현장"];

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pronounAlt() {
  return REGION_PRONOUNS.map(escapeRegExp).join("|");
}

/** 지역 토큰이 브랜드명 접두인지 (여주 + 목마 ⊂ 여주목마) */
export function isRegionEmbeddedInBrand(region, brand, text, offset, matchLen) {
  const r = String(region || "").trim();
  const b = String(brand || "").trim();
  if (!r || !b || r.length < 2 || !b.toLowerCase().startsWith(r.toLowerCase())) {
    return false;
  }
  const rest = b.slice(r.length);
  if (!rest) return false;
  const after = String(text || "").slice(offset + matchLen);
  return after.toLowerCase().startsWith(rest.toLowerCase());
}

/**
 * @param {string} text
 * @param {object} input
 */
export function repairRegionBrandMash(text = "", input = {}) {
  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  if (!text?.trim()) return text;

  let out = String(text);
  const escBrand = brand ? escapeRegExp(brand) : "";
  const pron = pronounAlt();

  if (brand && escBrand) {
    const stackRe = new RegExp(`(?:${pron})(?:\\s+(?:${pron}))*\\s*${escBrand}`, "gi");
    out = out.replace(stackRe, brand);

    if (brand.startsWith("현장")) {
      out = out.replace(/현장\s+현장목마/gi, brand);
    }
    if (brand.startsWith(region) && region.length >= 2) {
      out = out.replace(
        new RegExp(`${escapeRegExp(region)}\\s+${escBrand}`, "gi"),
        brand
      );
    }
    const tail = brand.match(/목마$/) ? "목마" : "";
    if (tail) {
      out = out.replace(
        new RegExp(`(?:${pron})${tail}`, "gi"),
        brand
      );
      out = out.replace(
        new RegExp(`(?:${pron})\\s+${tail}`, "gi"),
        brand
      );
    }
  }

  if (region) {
    const escRegion = escapeRegExp(region);
    out = out.replace(new RegExp(`(${escRegion})\\s+\\1`, "gi"), "$1");
    if (brand) {
      out = out.replace(
        new RegExp(
          `${escRegion}\\s+${escBrand}\\s*,?\\s*${escRegion}\\s+${escBrand}`,
          "gi"
        ),
        `${region} ${brand}`
      );
    }
  }

  out = out
    .replace(/\s*—\s*(?:근처|이\s*지역|현장)(?:\s+(?:근처|이\s*지역|현장))*\s*(?:목마|현장목마|여주목마|[가-힣]{2,10})?\s*(?=$|—)/g, " ")
    .replace(/(?:^|\s)[·>]\s*[·>]\s*/g, " ")
    .replace(/\s*>\s*·/g, " ·")
  .replace(/\s{2,}/g, " ")
    .trim();

  return out;
}

const MASH_COUNT_RES = [
  { key: "glued_geuncheo_mokma", re: /근처목마/gi, max: 0 },
  { key: "glued_region_mokma", re: /이\s*지역목마/gi, max: 0 },
  { key: "pronoun_brand_stack", re: /(?:근처|이\s*지역|현장)\s+(?:근처|이\s*지역|현장)+\s*[가-힣]{2,}/gi, max: 0 },
  { key: "double_scene_brand", re: /현장\s+현장목마/gi, max: 0 },
  { key: "region_region_brand", re: /여주\s+여주목마/gi, max: 0 },
];

/**
 * @param {string} fullText
 * @param {object} [input]
 */
export function scoreRegionBrandMash(fullText = "", input = {}) {
  const brand = String(input.brandName || "").trim();
  const text = String(fullText || "");
  const issues = [];

  for (const rule of MASH_COUNT_RES) {
    const count = (text.match(rule.re) || []).length;
    if (count > rule.max) {
      issues.push({ type: rule.key, count, max: rule.max });
    }
  }

  if (brand.length >= 2) {
    const esc = escapeRegExp(brand);
    const mashRe = new RegExp(`(?:${pronounAlt()})\\s*${esc}`, "gi");
    const mashCount = (text.match(mashRe) || []).length;
    const cap = 2;
    if (mashCount > cap) {
      issues.push({ type: "pronoun_before_brand", count: mashCount, max: cap });
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    version: REGION_BRAND_MASH_VERSION,
  };
}

export function applyRegionBrandMashRepairToPack(pack, input = {}) {
  if (!pack?.sections?.length) return pack;
  const map = (t) => repairRegionBrandMash(t, input);
  return {
    ...pack,
    title: map(pack.title),
    representativeTitle: map(pack.representativeTitle || pack.title),
    sections: (pack.sections || []).map((sec) => ({
      ...sec,
      heading: map(sec.heading),
      body: map(sec.body),
    })),
    conclusion: pack.conclusion ? map(pack.conclusion) : pack.conclusion,
    intro: pack.intro ? map(pack.intro) : pack.intro,
    _meta: {
      ...(pack._meta || {}),
      regionBrandMashRepair: true,
      regionBrandMashVersion: REGION_BRAND_MASH_VERSION,
    },
  };
}

export function applyRegionBrandMashRepairToChannelPack(pack, channel, input = {}) {
  if (!pack) return pack;
  const map = (t) => repairRegionBrandMash(t, input);

  if (channel === "place") {
    return {
      ...pack,
      title: map(pack.title),
      shortNotice: map(pack.shortNotice),
      detailBody: map(pack.detailBody),
      shortBody: map(pack.shortBody),
      body: map(pack.body),
    };
  }

  if (channel === "instagram") {
    const bodyKey = pack.lineBreakBody ? "lineBreakBody" : "body";
    return {
      ...pack,
      title: map(pack.title),
      hook: map(pack.hook),
      [bodyKey]: map(pack[bodyKey]),
      body: map(pack.body),
      ending: map(pack.ending),
      caption: map(pack.caption),
    };
  }

  return pack;
}

export function assessPackRegionBrandMash(pack, input = {}, channel = "blog") {
  const full =
    channel === "blog"
      ? getBlogFullText(pack)
      : getChannelFullText(pack, channel);
  return scoreRegionBrandMash(full, input);
}
