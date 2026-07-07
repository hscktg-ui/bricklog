/**
 * 채널 3종 — 브랜드·주제·형식 일관성 (내용 오염·블로그 복붙 감지)
 */
import { getChannelFullText } from "@/lib/content/channelPack";

export const CHANNEL_BUNDLE_VERSION = "channel-bundle-v1";

const BLOG_DUMP_IN_PLACE_RE =
  /#{1,3}\s|결론\s*[:：]|마무리\s*[:：]|첫\s*째\s*[,，]|둘\s*째\s*[,，]/;
const VISIT_REVIEW_IN_INFO_RE = /다녀왔|직접\s*가\s*봤|솔직\s*후기/;

function tokenSet(text = "") {
  return new Set(
    String(text || "")
      .toLowerCase()
      .replace(/[^\w가-힣\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 2)
  );
}

function overlapCount(a, b) {
  let n = 0;
  for (const t of a) if (b.has(t)) n += 1;
  return n;
}

/**
 * @param {{
 *   brandName?: string;
 *   topic?: string;
 *   region?: string;
 *   blogPack?: object;
 *   placePack?: object;
 *   instagramPack?: object;
 *   visitToneAllowed?: boolean;
 * }} ctx
 */
export function assessChannelBundleConsistency(ctx = {}) {
  const brand = String(ctx.brandName || "").trim();
  const topic = String(ctx.topic || "").trim();
  const region = String(ctx.region || "").trim();
  const visitOk = ctx.visitToneAllowed !== false;

  const blogText = getChannelFullText(ctx.blogPack, "blog");
  const placeText = getChannelFullText(ctx.placePack, "place");
  const instaText = getChannelFullText(ctx.instagramPack, "instagram");

  const failReasons = [];

  if (!blogText.replace(/\s/g, "").length) failReasons.push("missing_blog");
  if (!placeText.replace(/\s/g, "").length) failReasons.push("missing_place");
  if (!instaText.replace(/\s/g, "").length) failReasons.push("missing_instagram");

  if (brand.length >= 2) {
    if (!placeText.includes(brand)) failReasons.push("place_brand_missing");
    if (!instaText.includes(brand) && !instaText.includes(brand.slice(0, 2))) {
      failReasons.push("instagram_brand_missing");
    }
  }

  const blogLen = blogText.replace(/\s/g, "").length;
  const placeLen = placeText.replace(/\s/g, "").length;
  if (blogLen > 400 && placeLen > blogLen * 0.85) {
    failReasons.push("place_blog_dump");
  }
  if (BLOG_DUMP_IN_PLACE_RE.test(placeText)) {
    failReasons.push("place_blog_structure");
  }

  const topicTokens = tokenSet(topic);
  const placeTokens = tokenSet(placeText);
  const instaTokens = tokenSet(instaText);
  if (topicTokens.size >= 2) {
    if (overlapCount(topicTokens, placeTokens) < 1) {
      failReasons.push("place_topic_drift");
    }
    if (overlapCount(topicTokens, instaTokens) < 1) {
      failReasons.push("instagram_topic_drift");
    }
  }

  if (!visitOk) {
    if (VISIT_REVIEW_IN_INFO_RE.test(placeText) || VISIT_REVIEW_IN_INFO_RE.test(instaText)) {
      failReasons.push("visit_leak_in_channels");
    }
  }

  if (region.length >= 2) {
    const regionInPlace =
      placeText.includes(region) ||
      placeText.includes(region.replace(/\s/g, "").slice(0, 2));
    if (!regionInPlace && /플레이스|매장|방문/.test(placeText)) {
      failReasons.push("place_region_weak");
    }
  }

  const ok = failReasons.length === 0;
  return {
    version: CHANNEL_BUNDLE_VERSION,
    ok,
    failReasons,
    lengths: { blog: blogLen, place: placeLen, instagram: instaText.replace(/\s/g, "").length },
  };
}
