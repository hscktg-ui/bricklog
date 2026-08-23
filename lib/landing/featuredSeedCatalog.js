/**
 * 랜딩·공개테스트 공통 — 엔진에 쓰인 featured 샘플 카탈로그
 */
import { FEATURED_SAMPLE_SEEDS } from "@/lib/landing/featuredSampleSeeds";
import { FEATURED_SAMPLE_SEEDS_EXTRA } from "@/lib/landing/featuredSampleSeedsExtra";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";

export const ALL_FEATURED_SAMPLE_SEEDS = [
  ...FEATURED_SAMPLE_SEEDS,
  ...FEATURED_SAMPLE_SEEDS_EXTRA,
];

/** 공개테스트 sample.id → featured seed.id */
export const PUBLIC_TEST_TO_FEATURED_ID = {
  cafe_brunch: "cafe_rainy_brunch",
  flower_gift: "flower_summer_gift",
  clinic_visit: "clinic_checkup",
  pension_weekend: "pension_weekend",
  salon_care: "salon_scalp_dye",
  bakery_open: "bakery_open",
  pet_groom: "pet_groom",
  yoga_today: "yoga_today",
  korean_dining: "korean_dining",
  nail_room: "nail_room",
  w_academy: "w_academy",
  move_heaven: "move_heaven",
  sky_wedding: "sky_wedding",
  barun_auto: "barun_auto",
  auto_service: "barun_auto",
  core_pilates: "core_pilates",
};

export const FEATURED_SEED_INDUSTRY = {
  cafe_rainy_brunch: "카페",
  flower_summer_gift: "꽃집",
  clinic_checkup: "의료",
  pension_weekend: "숙박",
  salon_scalp_dye: "미용실",
  bakery_open: "베이커리",
  pet_groom: "펫샵",
  yoga_today: "요가",
  korean_dining: "한식",
  nail_room: "네일",
  w_academy: "학원",
  move_heaven: "이사",
  sky_wedding: "웨딩",
  barun_auto: "자동차",
  core_pilates: "필라테스",
};

const SKIP_REGION_TOKENS = new Set([
  "서울",
  "경기",
  "경기도",
  "부산",
  "인천",
  "대구",
  "대전",
  "제주",
  "제주도",
  "광주",
  "울산",
  "세종",
]);

export function industryForFeaturedSeed(seed = {}) {
  const id = String(seed.id || "").trim();
  return seed.industry || FEATURED_SEED_INDUSTRY[id] || "";
}

export function findFeaturedSeedById(seedId = "") {
  const id = String(seedId || "").trim();
  if (!id) return null;
  return ALL_FEATURED_SAMPLE_SEEDS.find((s) => s.id === id) || null;
}

/**
 * 공개테스트 샘플 → 엔진 featured seed
 * @param {{ id?: string, brandName?: string, name?: string, region?: string }} sample
 */
export function findFeaturedSeedForSample(sample = {}) {
  const rawId = String(sample.id || "").trim();
  const mapped = PUBLIC_TEST_TO_FEATURED_ID[rawId] || rawId;
  const byId = findFeaturedSeedById(mapped);
  if (byId) return byId;

  const brand = String(sample.brandName || sample.name || "").trim();
  if (!brand) return null;
  return ALL_FEATURED_SAMPLE_SEEDS.find((s) => s.name === brand) || null;
}

function sameBrand(seed, sample) {
  const toBrand = String(sample.brandName || sample.name || "").trim();
  const fromBrand = String(seed.name || "").trim();
  return !toBrand || toBrand === fromBrand;
}

function rewriteBrandRegion(text, seed, sample) {
  const fromBrand = String(seed.name || "").trim();
  const toBrand = String(sample.brandName || sample.name || "").trim();
  const fromRegion = String(seed.region || "").trim();
  const toRegion = String(sample.region || "").trim();
  const pairs = [];

  if (fromBrand && toBrand && fromBrand !== toBrand) {
    pairs.push([fromBrand, toBrand]);
  }
  if (fromRegion && toRegion && fromRegion !== toRegion) {
    pairs.push([fromRegion, toRegion]);
    const fromParts = fromRegion.split(/\s+/).filter(Boolean);
    const toParts = toRegion.split(/\s+/).filter(Boolean);
    const toLast = toParts[toParts.length - 1] || toRegion;
    for (const part of fromParts) {
      if (part.length < 2 || SKIP_REGION_TOKENS.has(part)) continue;
      pairs.push([`${part}역`, `${toLast} 인근`]);
      pairs.push([part, toLast]);
    }
  }

  pairs.sort((a, b) => b[0].length - a[0].length);
  let out = String(text || "");
  for (const [from, to] of pairs) {
    if (!from || from === to) continue;
    out = out.split(from).join(to);
  }
  return out;
}

/**
 * 다른 브랜드로 공개테스트할 때 featured 글을 브랜드·지역만 맞춰 재사용
 */
export function adaptFeaturedSeedToSample(seed, sample = null) {
  if (!seed) return null;
  if (!sample || sameBrand(seed, sample)) return seed;

  const rewrite = (text) => rewriteBrandRegion(text, seed, sample);
  return {
    ...seed,
    name: String(sample.brandName || sample.name || seed.name).trim(),
    region: String(sample.region || seed.region).trim(),
    topic: String(sample.topic || seed.topic).trim(),
    topicTrait: sample.topicTrait || seed.topicTrait,
    industry: sample.industry || industryForFeaturedSeed(seed),
    blogTitle: rewrite(seed.blogTitle),
    blogExcerpt: rewrite(seed.blogExcerpt),
    blogSections: (seed.blogSections || []).map((section) => ({
      heading: rewrite(section.heading),
      body: rewrite(section.body),
    })),
    blogConclusion: rewrite(seed.blogConclusion),
    placeTitle: rewrite(seed.placeTitle),
    placeShort: rewrite(seed.placeShort),
    placeDetail: rewrite(seed.placeDetail),
    instaBody: rewrite(seed.instaBody),
  };
}

function splitLongSections(sections, minCount) {
  const out = sections.map((s) => ({
    heading: String(s.heading || "").trim(),
    body: String(s.body || "").trim(),
  }));

  while (out.length < minCount) {
    const idx = out.findIndex((s) => s.body.split(/\n\n+/).length >= 2);
    if (idx < 0) break;
    const parts = out[idx].body.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
    const mid = Math.ceil(parts.length / 2);
    const heading = out[idx].heading;
    out.splice(
      idx,
      1,
      { heading, body: parts.slice(0, mid).join("\n\n") },
      { heading: `${heading} · 이어서`, body: parts.slice(mid).join("\n\n") }
    );
  }
  return out;
}

function bulletsToProse(text = "") {
  return String(text || "")
    .split(/\n+/)
    .map((line) => line.replace(/^[·\-•]\s*/, "").trim())
    .filter(Boolean)
    .join(" ");
}

function ensureFeaturedBlogLength(pack, seed, minChars = 420) {
  const extras = [
    {
      heading: "방문·예약 전에",
      body: bulletsToProse(seed.placeDetail || seed.placeShort),
    },
    {
      heading: "짧게 남기는 소식",
      body: String(seed.instaBody || "")
        .replace(/#[^\s#]+/g, "")
        .replace(/\n{2,}/g, "\n")
        .trim(),
    },
    {
      heading: "이렇게 정리하면 됩니다",
      body: [seed.blogExcerpt, seed.placeShort, seed.blogConclusion]
        .filter(Boolean)
        .join(" "),
    },
  ];

  for (const extra of extras) {
    if (countBlogBodyCharsWithSpaces(pack) >= minChars) break;
    if (!extra.body || extra.body.replace(/\s/g, "").length < 24) continue;
    if (pack.sections.some((s) => s.body === extra.body)) continue;
    pack.sections.push(extra);
  }
  return pack;
}

export function blogPackFromFeaturedSeed(seed, sample = null) {
  const adapted = adaptFeaturedSeedToSample(seed, sample);
  let sections = (adapted.blogSections || []).filter(
    (s) => String(s.body || "").trim()
  );
  const conclusion = String(adapted.blogConclusion || "").trim();
  if (sections.length < 5 && conclusion) {
    sections = [
      ...sections,
      { heading: "마치며", body: conclusion },
    ];
  }
  sections = splitLongSections(sections, 5);

  const hashtags = (String(adapted.instaBody || "").match(/#[^\s#]+/g) || [])
    .slice(0, 5);

  return ensureFeaturedBlogLength(
    {
      title: adapted.blogTitle,
      representativeTitle: adapted.blogTitle,
      sections,
      conclusion,
      hashtags,
    },
    adapted
  );
}
