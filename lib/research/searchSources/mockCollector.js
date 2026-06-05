/**
 * 공개 정보 수집 (Mock) — API 연동 전 구조
 * 원문 문장 저장·복사 금지, 키워드·주제 신호만 수집
 */
import { inferBrandProfile } from "@/lib/brands/brandPresets";
import { getActiveSeasonContext } from "@/lib/season/seasonEngine";
import { parsePhraseList, sanitizeText } from "@/utils/sanitizeInput";

const SOURCE_TYPES = [
  "google",
  "naver",
  "naver_place",
  "official_site",
  "official_blog",
  "instagram",
  "news",
  "reviews",
];

function hashPick(arr, seed) {
  if (!arr?.length) return null;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i)) % 997;
  return arr[h % arr.length];
}

function buildTrendTopics(input, profile) {
  const date = input.contentDate
    ? new Date(`${input.contentDate}T12:00:00`)
    : new Date();
  const season = getActiveSeasonContext(date);
  const region = sanitizeText(input.region);
  const topic = sanitizeText(input.topic || input.mainKeyword);
  const brand = sanitizeText(input.brandName);

  const base = [
    season.label,
    season.event || null,
    region ? `${region} 방문` : null,
    topic,
    brand,
    input.purposeType === "newOpen" ? "오픈·첫 방문" : null,
    input.purposeType === "season" ? "시즌·선물" : null,
  ].filter(Boolean);

  const include = parsePhraseList(input.includePhrases || "");
  return [...new Set([...base, ...include])].slice(0, 8);
}

function collectFromProfile(profile, input) {
  if (!profile) return { signals: [], themes: [] };
  const signals = [
    profile.brandDescription,
    profile.includePhrases,
    profile.brandMood,
    profile.placeStyle,
    profile.blogStyle,
  ]
    .filter(Boolean)
    .flatMap((s) => parsePhraseList(s));

  return {
    signals: [...new Set(signals)],
    themes: [profile.brandMood, profile.writingStyle].filter(Boolean),
  };
}

/**
 * @returns {{ sources: Array, trendTopics: string[], reviewThemes: string[], collectedAt: string }}
 */
export function collectPublicSignals(input = {}) {
  const brandName = sanitizeText(input.brandName);
  const region = sanitizeText(input.region);
  const seed = `${brandName}|${region}|${input.mainKeyword}`;
  const profile = inferBrandProfile(brandName);
  const includeList = parsePhraseList(input.includePhrases || input.includeList);
  const description = sanitizeText(input.brandDescription || input.storeFeatures);

  const userSignals = [
    ...includeList,
    description,
    input.benefit,
    input.mainKeyword,
    ...parsePhraseList(input.subKeyword),
  ].filter(Boolean);

  const { signals: profileSignals, themes } = collectFromProfile(profile, input);
  const allSignals = [...new Set([...userSignals, ...profileSignals])];

  const cloudResearch =
    (process.env.BRICLOG_CLOUD_RESEARCH || "").trim().toLowerCase() === "true" ||
    (process.env.GOOGLE_CSE_API_KEY && process.env.GOOGLE_CSE_CX) ||
    process.env.SERPAPI_API_KEY;
  const cloudTypes = new Set(["google", "naver", "naver_place", "news"]);

  const sources = SOURCE_TYPES.map((type) => {
    const available =
      type === "reviews" ||
      type === "naver_place" ||
      (cloudResearch && cloudTypes.has(type));
    return {
      type,
      status: available ? "mock_inferred" : "pending_api",
      signalCount: available ? Math.min(3, allSignals.length) : 0,
      topics: available
        ? allSignals.slice(0, 3).map((s) => s.slice(0, 24))
        : [],
    };
  });

  const trendTopics = buildTrendTopics(input, profile);
  const reviewThemes = [
    hashPick(["친절·응대", "분위기·공간", "가격·구성", "재방문 의사"], seed),
    hashPick(["사진과 현장 차이", "대기·예약", "시즌 만족"], seed + "r"),
  ].filter(Boolean);

  return {
    sources,
    signals: allSignals,
    profileThemes: themes,
    trendTopics,
    reviewThemes,
    collectedAt: new Date().toISOString(),
    hasSearchData: Boolean(
      cloudResearch || profile || allSignals.length > 2
    ),
    cloudResearchEnabled: cloudResearch,
  };
}
