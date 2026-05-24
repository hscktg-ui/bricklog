import { DEFAULT_BLOG_INPUT } from "@/lib/constants";
import { inferBrandProfile } from "./brandPresets";
import { parsePhraseList } from "@/utils/sanitizeInput";
import { getBrandStorageScope } from "./brandStorageScope";
import {
  isInternalDemoWorkspace,
  normalizeUserId,
} from "@/lib/user/workspaceStorage";
import { FICTIONAL_DEMO_SEED_BRANDS } from "@/lib/examples/fictionalBrands";

const brandsKey = (userId) => `briclog-brands-v2-${normalizeUserId(userId)}`;
const workspaceKey = (userId) => `briclog-workspace-v2-${normalizeUserId(userId)}`;

export function createEmptyBrandMemory(overrides = {}) {
  const inferred = inferBrandProfile(overrides.brandName);
  return {
    id: overrides.id || `brand-${Date.now()}`,
    brandName: overrides.brandName || "",
    brandType: overrides.brandType || "other",
    industry: overrides.industry || inferred?.industry || "",
    region: overrides.region || "",
    tone: overrides.tone || inferred?.tone || "emotional",
    kpiGoal: overrides.kpiGoal || inferred?.kpiGoal || "save",
    brandMood: overrides.brandMood || inferred?.brandMood || "",
    emojiLevel: overrides.emojiLevel || inferred?.emojiLevel || "low",
    emojiDensity:
      overrides.emojiDensity ||
      overrides.emojiLevel ||
      inferred?.emojiLevel ||
      "low",
    emojiStyle: overrides.emojiStyle || overrides.emojiLevel || "low",
    preferredEmojiStyle: overrides.preferredEmojiStyle || "",
    bannedWords: overrides.bannedWords || overrides.forbiddenWords || "",
    preferredSentenceLength:
      overrides.preferredSentenceLength ||
      overrides.preferredSentenceStyle ||
      "medium",
    preferredSentenceStyle:
      overrides.preferredSentenceStyle || inferred?.writingStyle || "medium",
    forbiddenWords: overrides.forbiddenWords || inferred?.excludePhrases || "",
    preferredKeywords: overrides.preferredKeywords || "",
    writingStyle: overrides.writingStyle || inferred?.blogStyle || "",
    ctaStyle: overrides.ctaStyle || "",
    instagramMood: overrides.instagramMood || inferred?.instagramMood || "",
    placeStyle: overrides.placeStyle || inferred?.placeStyle || "",
    blogStyle: overrides.blogStyle || inferred?.blogStyle || "",
    targetAudience: overrides.targetAudience || "",
    brandDescription:
      overrides.brandDescription || inferred?.brandDescription || "",
    includePhrases: overrides.includePhrases || inferred?.includePhrases || "",
    mainKeyword: overrides.mainKeyword || "",
    subKeyword: overrides.subKeyword || "",
    frequentlyUsedExpressions: overrides.frequentlyUsedExpressions || [],
    avoidedExpressions: overrides.avoidedExpressions || [],
    successfulHooks: overrides.successfulHooks || [],
    highPerformingPatterns: overrides.highPerformingPatterns || [],
    recentContent: overrides.recentContent || { blog: null, place: null, insta: null },
    contentArchive: overrides.contentArchive || { blog: [], place: [], insta: [] },
    updatedAt: new Date().toISOString(),
  };
}

function getDemoSeedBrands() {
  return FICTIONAL_DEMO_SEED_BRANDS.map((s) => createEmptyBrandMemory(s));
}

export function loadAgency() {
  const { userId, demoMode } = getBrandStorageScope();
  const isDemo = isInternalDemoWorkspace(userId, demoMode);
  if (typeof window === "undefined") {
    return {
      id: "workspace",
      name: isDemo ? "데모 워크스페이스" : "내 브랜드 창고",
      brandIds: [],
    };
  }
  try {
    const raw = localStorage.getItem(workspaceKey(userId));
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  const brands = loadAllBrands();
  return {
    id: `ws-${normalizeUserId(userId)}`,
    name: isDemo ? "데모 워크스페이스 (내부)" : "내 브랜드 창고",
    brandIds: brands.map((b) => b.id),
  };
}

export function saveAgency(agency) {
  const { userId } = getBrandStorageScope();
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(workspaceKey(userId), JSON.stringify(agency));
  } catch {
    /* ignore */
  }
}

export function loadAllBrands() {
  const { userId, demoMode } = getBrandStorageScope();
  const isDemo = isInternalDemoWorkspace(userId, demoMode);
  if (typeof window === "undefined") {
    return isDemo ? getDemoSeedBrands() : [];
  }
  try {
    const raw = localStorage.getItem(brandsKey(userId));
    const list = raw ? JSON.parse(raw) : [];
    if (list.length) return list;
    return [];
  } catch {
    return [];
  }
}

/** 데모용 샘플 — 사용자가 선택할 때만 저장 */
export function importDemoSampleBrands() {
  const seeds = getDemoSeedBrands();
  saveAllBrands(seeds);
  return seeds;
}

export function saveAllBrands(brands) {
  const { userId } = getBrandStorageScope();
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(brandsKey(userId), JSON.stringify(brands));
    const agency = loadAgency();
    agency.brandIds = brands.map((b) => b.id);
    saveAgency(agency);
  } catch {
    /* ignore */
  }
}

export function getBrandById(id) {
  return loadAllBrands().find((b) => b.id === id) || null;
}

export function upsertBrand(brand) {
  const list = loadAllBrands();
  const idx = list.findIndex((b) => b.id === brand.id);
  const next = { ...brand, updatedAt: new Date().toISOString() };
  if (idx >= 0) list[idx] = next;
  else list.push(next);
  saveAllBrands(list);
  return next;
}

export function brandMemoryToFormInput(brand) {
  if (!brand) return { ...DEFAULT_BLOG_INPUT };
  const inferred = inferBrandProfile(brand.brandName);
  const forbidden = [
    brand.forbiddenWords,
    inferred?.excludePhrases,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    ...DEFAULT_BLOG_INPUT,
    brandId: brand.id,
    brandType: brand.brandType || DEFAULT_BLOG_INPUT.brandType,
    industry: brand.industry || "",
    purpose: mapKpiToPurpose(brand.kpiGoal),
    tone: brand.tone || DEFAULT_BLOG_INPUT.tone,
    kpiGoal: brand.kpiGoal || "save",
    region: brand.region || "",
    brandName: brand.brandName || "",
    mainKeyword: brand.mainKeyword || brand.preferredKeywords?.split(",")?.[0] || "",
    subKeyword: brand.subKeyword || "",
    includePhrases: brand.includePhrases || "",
    excludePhrases: forbidden,
    brandDescription: brand.brandDescription || "",
    storeFeatures: brand.brandDescription || "",
    benefit: "",
    emojiDensity: brand.emojiDensity || brand.emojiLevel || "low",
    v4Speaker: brand.v4Speaker || DEFAULT_BLOG_INPUT.v4Speaker,
    emotionTemperature:
      brand.emotionTemperature || DEFAULT_BLOG_INPUT.emotionTemperature,
    speechStyle: brand.speechStyle || DEFAULT_BLOG_INPUT.speechStyle,
    proficiency: brand.proficiency || DEFAULT_BLOG_INPUT.proficiency,
  };
}

function mapKpiToPurpose(kpi) {
  const map = {
    search: "info",
    save: "season",
    reservation: "visitDrive",
    branding: "brand",
    newOpen: "newOpen",
    event: "season",
  };
  return map[kpi] || "season";
}

export function mergeBrandFromForm(brand, formInput) {
  return {
    ...brand,
    brandName: formInput.brandName || brand.brandName,
    brandType: formInput.brandType || brand.brandType,
    industry: formInput.industry ?? brand.industry,
    region: formInput.region,
    tone: formInput.tone,
    kpiGoal: formInput.kpiGoal || brand.kpiGoal,
    mainKeyword: formInput.mainKeyword,
    subKeyword: formInput.subKeyword,
    includePhrases: formInput.includePhrases,
    forbiddenWords: formInput.excludePhrases,
    emojiDensity: formInput.emojiDensity || brand.emojiDensity,
    brandDescription: formInput.brandDescription,
    v4Speaker: formInput.v4Speaker || brand.v4Speaker,
    emotionTemperature: formInput.emotionTemperature || brand.emotionTemperature,
    speechStyle: formInput.speechStyle || brand.speechStyle,
    proficiency: formInput.proficiency || brand.proficiency,
  };
}

export function syncBrandFromForm(brand, formInput) {
  return upsertBrand(mergeBrandFromForm(brand, formInput));
}

export function recordBrandContent(brandId, channel, content, plainText = "") {
  const brand = getBrandById(brandId);
  if (!brand) return;
  const at = new Date().toISOString();
  const archive = { ...(brand.contentArchive || { blog: [], place: [], insta: [] }) };
  const entry = {
    at,
    text: plainText?.slice(0, 2000) || "",
    versionSource:
      content?._meta?.generationMode || content?._meta?.source || "generate",
  };
  const list = [...(archive[channel] || []), entry].slice(-5);
  archive[channel] = list;

  const hooks = [...(brand.successfulHooks || [])];
  if (channel === "insta" && content?.hook && !hooks.includes(content.hook)) {
    hooks.unshift(content.hook);
  }

  const patterns = [...(brand.highPerformingPatterns || [])];
  if (channel === "blog" && content?.sections?.[0]?.heading) {
    const p = content.sections[0].heading;
    if (!patterns.includes(p)) patterns.unshift(p);
  }

  upsertBrand({
    ...brand,
    recentContent: {
      ...brand.recentContent,
      [channel]: {
        at,
        preview:
          channel === "blog"
            ? content?.representativeTitle
            : channel === "place"
              ? content?.title
              : content?.hook,
        edited: !!content?._edited,
      },
    },
    contentArchive: archive,
    successfulHooks: hooks.slice(0, 8),
    highPerformingPatterns: patterns.slice(0, 8),
  });
}

export function getBrandContentArchive(brandId, channel) {
  const brand = getBrandById(brandId);
  return brand?.contentArchive?.[channel] || [];
}

export function searchBrands(query, sourceList) {
  const q = (query || "").trim().toLowerCase();
  const base = sourceList ?? loadAllBrands();
  if (!q) return base;
  return base.filter(
    (b) =>
      b.brandName?.toLowerCase().includes(q) ||
      b.region?.toLowerCase().includes(q)
  );
}
