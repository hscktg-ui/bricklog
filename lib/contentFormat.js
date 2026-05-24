import { flattenHashtagPack } from "@/lib/prompts/engine/hashtagEngine";

/** DB 저장용 JSON 직렬화 */
export function serializeContent(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

/** DB / legacy 문자열 → 객체 */
export function parseStoredContent(value, fallback = null) {
  if (value == null || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    const parsed = JSON.parse(value);
    return parsed;
  } catch {
    return value;
  }
}

export function formatBlogForCopy(blog) {
  if (!blog || typeof blog === "string") return String(blog || "");
  const lines = [];
  if (blog.titles?.length) {
    lines.push("【추천 제목】");
    blog.titles.forEach((t, i) => lines.push(`${i + 1}. ${t}`));
    lines.push("");
  }
  lines.push(`【제목】${blog.title || ""}`);
  lines.push("");
  blog.sections?.forEach((s) => {
    lines.push(`■ ${s.heading}`);
    lines.push(s.body);
    lines.push("");
  });
  lines.push("【마무리】");
  lines.push(blog.conclusion || "");
  lines.push("");
  lines.push("【해시태그】");
  lines.push((blog.hashtags || []).join(" "));
  return lines.join("\n");
}

export function formatPlaceForCopy(place) {
  if (!place || typeof place === "string") return String(place || "");
  if (place.shortBody && place.detailBody) {
    return [
      `【제목】${place.title}`,
      "",
      "【요약】",
      place.shortBody,
      "",
      "【상세 본문】",
      place.detailBody,
      "",
      "【CTA】",
      place.cta,
      "",
      "【해시태그】",
      (place.hashtags || []).join(" "),
    ].join("\n");
  }
  return `【제목】${place.title}\n\n${place.body}\n\n${place.cta}`;
}

export function formatInstaForCopy(insta) {
  if (!insta || typeof insta === "string") return String(insta || "");
  const body = insta.lineBreakBody || insta.body || "";
  const lines = [];
  if (insta.hook) {
    lines.push(insta.hook);
    lines.push("");
  }
  lines.push(body);
  if (insta.ending && !body.includes(insta.ending)) {
    lines.push("");
    lines.push(insta.ending);
  }
  lines.push("");
  lines.push((insta.hashtags || []).join(" "));
  return lines.join("\n");
}

export function formatHashtagForCopy(tags) {
  if (!tags) return "";
  if (Array.isArray(tags)) return tags.join(" ");

  const groups = [
    ["지역", tags.localTags],
    ["브랜드", tags.brandTags],
    ["SEO", tags.seoTags],
    ["트렌드", tags.trendTags],
    ["시즌", tags.seasonalTags],
  ];
  const lines = [];
  for (const [label, list] of groups) {
    if (list?.length) {
      lines.push(`【${label}】`);
      lines.push(list.join(" "));
      lines.push("");
    }
  }
  if (lines.length === 0) return flattenHashtagPack(tags).join(" ");
  return lines.join("\n").trim();
}

export function formatImageForCopy(img) {
  if (!img || typeof img === "string") return String(img || "");
  const t = img.thumbnailPrompt || img.thumbnail;
  const p = img.placeImagePrompt || img.placeImage;
  const i = img.instagramCardPrompt || img.instagramCard;
  const b = img.bannerPrompt || "";
  return [
    "【블로그 썸네일】",
    t,
    "",
    "【플레이스 이미지】",
    p,
    "",
    "【인스타 카드】",
    i,
    b ? "\n【배너】\n" + b : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function formatAllChannelsForCopy(results) {
  const parts = [
    "======== BRICLOG · 전체 채널팩 ========\n",
    formatBlogForCopy(results.blog),
    "\n\n======== 플레이스 ========\n",
    formatPlaceForCopy(results.smartplace),
    "\n\n======== 인스타 ========\n",
    formatInstaForCopy(results.insta),
    "\n\n======== 해시태그 ========\n",
    formatHashtagForCopy(results.hashtag),
    "\n\n======== 이미지 프롬프트 ========\n",
    formatImageForCopy(results.imagePrompt),
  ];
  return parts.join("\n");
}

export function formatTabForCopy(tabId, results) {
  switch (tabId) {
    case "blog":
      return formatBlogForCopy(results.blog);
    case "smartplace":
      return formatPlaceForCopy(results.smartplace);
    case "insta":
      return formatInstaForCopy(results.insta);
    case "hashtag":
      return formatHashtagForCopy(results.hashtag);
    case "image":
    case "imagePrompt":
      return formatImageForCopy(results.imagePrompt);
    default:
      return "";
  }
}
