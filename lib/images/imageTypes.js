export const IMAGE_TYPES = [
  { id: "blog_thumbnail", label: "블로그 썸네일", promptKey: "thumbnailPrompt", defaultRatio: "1:1" },
  { id: "naver_representative", label: "네이버 대표", promptKey: "thumbnailPrompt", defaultRatio: "1:1" },
  { id: "place_banner", label: "플레이스 배너", promptKey: "placeImagePrompt", defaultRatio: "1:1" },
  { id: "insta_feed", label: "인스타 피드", promptKey: "instagramCardPrompt", defaultRatio: "4:5" },
  { id: "insta_story", label: "인스타 스토리", promptKey: "instagramCardPrompt", defaultRatio: "9:16" },
  { id: "card_news", label: "카드뉴스", promptKey: "instagramCardPrompt", defaultRatio: "4:5" },
  { id: "event_banner", label: "이벤트 배너", promptKey: "bannerPrompt", defaultRatio: "16:9" },
  { id: "event_poster", label: "이벤트 포스터", promptKey: "bannerPrompt", defaultRatio: "9:16" },
];

export function normalizeRatio(ratio) {
  const r = String(ratio || "auto").trim();
  if (r === "5:5" || r === "1:1") return "1:1";
  if (["4:5", "16:9", "9:16", "auto"].includes(r)) return r;
  return "16:9";
}

export function resolveRatio(typeId, ratio) {
  const normalized = normalizeRatio(ratio);
  if (normalized !== "auto") return normalized;
  const t = IMAGE_TYPES.find((x) => x.id === typeId);
  return t?.defaultRatio || "16:9";
}

export function getImageType(typeId) {
  return IMAGE_TYPES.find((t) => t.id === typeId) || IMAGE_TYPES[0];
}
