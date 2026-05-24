import { getSeasonHint } from "./seasonHints";
import { formatHashtag, regionCompact } from "./textUtils";

function uniqueTags(list) {
  return [...new Set(list.map(formatHashtag).filter(Boolean))];
}

/**
 * 목적별 해시태그 팩
 */
export function buildHashtagPack(ctx, flavor, purpose, articleType) {
  const season = getSeasonHint();
  const rc = regionCompact(ctx.region);
  const main = ctx.main.replace(/\s+/g, "");
  const brand = ctx.brandName.replace(/\s+/g, "");

  const localTags = uniqueTags([
    ctx.region,
    rc,
    `${rc}맛집`,
    `${rc}핫플`,
    `${rc}추천`,
    `${rc}${flavor.label.replace(/\s+/g, "")}`,
    "동네추천",
    "지역맛집",
    "근처맛집",
    "로컬맛집",
  ]);

  const brandTags = uniqueTags([
    brand,
    ctx.brandName,
    `${brand}추천`,
    ctx.main,
    ...ctx.subList,
    "브릭로그",
  ]);

  const seoTags = uniqueTags([
    ctx.main,
    `${main}추천`,
    `${main}후기`,
    `${rc}${main}`,
    `${ctx.region} ${flavor.label}`,
    "네이버블로그",
    "네이버플레이스",
    "플레이스후기",
    "블로그리뷰",
    "지역검색",
    "검색추천",
    articleType.label,
    purpose.label,
  ]);

  const trendTags = uniqueTags([
    "일상기록",
    "저장각",
    "감성사진",
    "핫플",
    "인스타감성",
    "주말나들이",
    "데일리",
    "소확행",
    "로컬브랜드",
    "동네카페",
    "힙한곳",
    "요즘핫한",
    flavor.label,
  ]);

  const seasonalTags = uniqueTags([
    season.label,
    ...season.tags,
    `${season.label}추천`,
    purpose.label,
    "시즌한정",
    "이벤트",
    "예약",
    "방문후기",
    "할인",
  ]);

  const grouped = {
    localTags: localTags.slice(0, 12),
    brandTags: brandTags.slice(0, 10),
    seoTags: seoTags.slice(0, 14),
    trendTags: trendTags.slice(0, 12),
    seasonalTags: seasonalTags.slice(0, 10),
  };

  const all = uniqueTags([
    ...grouped.localTags,
    ...grouped.brandTags,
    ...grouped.seoTags,
    ...grouped.trendTags,
    ...grouped.seasonalTags,
  ]);

  return {
    ...grouped,
    all: all.slice(0, 30),
    _meta: {
      channel: "hashtag",
      total: all.length,
    },
  };
}

/** UI·복사용 플랫 배열 (레거시 호환) */
export function flattenHashtagPack(pack) {
  if (!pack) return [];
  if (Array.isArray(pack)) return pack;
  if (pack.all?.length) return pack.all;
  return [
    ...(pack.localTags || []),
    ...(pack.brandTags || []),
    ...(pack.seoTags || []),
    ...(pack.trendTags || []),
    ...(pack.seasonalTags || []),
  ];
}
