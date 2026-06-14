/**
 * 가입 전·랜딩 샘플 — 블로그에서 플레이스·인스타 파생 + 전문가 패널 마감
 */
import {
  extractBlogInsights,
  buildPipelineContext,
} from "@/lib/contentPipeline";
import { buildPlaceFromBlog } from "@/styles/channels/placeStyle";
import { buildInstagramFromBlog } from "@/styles/channels/instagramStyle";
import { finishChannelPack } from "@/lib/product/channelQualityStack";
import { applyPlaceExpertPanel } from "@/lib/channel/placeExpertPanel";
import { applyInstagramExpertPanel } from "@/lib/channel/instagramExpertPanel";

function countNoSpace(text = "") {
  return String(text || "").replace(/\s/g, "").length;
}

function buildChannelInput(sample = {}, blogPack = {}) {
  const topic = String(sample.topic || sample.mainKeyword || "").trim();
  return {
    brandName: sample.brandName || sample.name,
    region: sample.region,
    mainKeyword: topic,
    topic,
    includePhrases: sample.topicTrait || sample.includePhrases,
    industry: sample.industry,
    businessType: sample.industry,
    publicTestMode: Boolean(sample.publicTestMode),
    tone: "emotional",
    purpose: "season",
  };
}

function seedPlaceFromFeatured(seed = {}) {
  if (!seed.placeShort && !seed.placeDetail) return null;
  const short = String(seed.placeShort || "").trim();
  const detail = String(seed.placeDetail || "").trim();
  if (countNoSpace(short) < 12 && countNoSpace(detail) < 80) return null;
  return {
    title: seed.placeTitle || seed.name || seed.brandName,
    shortNotice: short,
    shortBody: short,
    detailBody: detail,
    cta: "플레이스에서 자세히 확인해 주세요",
    body: [short, detail].filter(Boolean).join("\n\n"),
    _meta: { channel: "smartplace", source: "featured_seed" },
  };
}

function seedInstaFromFeatured(seed = {}) {
  const body = String(seed.instaBody || "").trim();
  if (countNoSpace(body) < 40) return null;
  return {
    lineBreakBody: body,
    body,
    legacyBody: body,
    _meta: { channel: "instagram", source: "featured_seed" },
  };
}

/**
 * @param {object} sample — public test sample or featured seed
 * @param {object} blogPack — blog sections pack
 */
export function buildChannelPacksFromBlog(sample = {}, blogPack = {}) {
  const input = buildChannelInput(sample, blogPack);
  const insights = extractBlogInsights(blogPack);
  const ctx = buildPipelineContext(input, blogPack, insights);
  const label = `${input.region || ""} ${input.brandName || ""} 샘플`.trim();

  let place = buildPlaceFromBlog(ctx, insights, label);
  place = finishChannelPack("place", place, { input, ...ctx, insights, sourceChannel: "blog" });
  place = applyPlaceExpertPanel(place, { ...ctx, input, insights });

  let instagram = buildInstagramFromBlog(ctx, insights, "emotional", label);
  instagram = finishChannelPack("instagram", instagram, {
    input,
    ...ctx,
    insights,
    sourceChannel: "blog",
  });
  instagram = applyInstagramExpertPanel(instagram, { ...ctx, input, insights });

  return { place, instagram, insights, input, ctx };
}

/**
 * 랜딩 featured seed — 시드가 강하면 우선, 약하면 블로그 파생
 */
export function buildLandingChannelPacks(seed = {}, blogPack = {}) {
  const seededPlace = seedPlaceFromFeatured(seed);
  const seededInsta = seedInstaFromFeatured(seed);
  const derived = buildChannelPacksFromBlog(
    {
      brandName: seed.name,
      region: seed.region,
      topic: seed.topic,
      topicTrait: seed.topicTrait,
      industry: seed.industry,
    },
    blogPack
  );

  const place =
    seededPlace && countNoSpace(seededPlace.detailBody) >= 120
      ? applyPlaceExpertPanel(
          finishChannelPack("place", seededPlace, {
            input: derived.input,
            ...derived.ctx,
            insights: derived.insights,
            sourceChannel: "featured",
          }),
          { ...derived.ctx, input: derived.input, insights: derived.insights }
        )
      : derived.place;

  const instagram =
    seededInsta && countNoSpace(seededInsta.lineBreakBody) >= 80
      ? applyInstagramExpertPanel(
          finishChannelPack("instagram", seededInsta, {
            input: derived.input,
            ...derived.ctx,
            insights: derived.insights,
            sourceChannel: "featured",
          }),
          { ...derived.ctx, input: derived.input, insights: derived.insights }
        )
      : derived.instagram;

  return { place, instagram };
}

/** UI용 플레이스·인스타 구조 */
export function toLandingPlaceUi(placePack = {}, seed = {}) {
  return {
    title: placePack.title || seed.placeTitle || seed.name,
    short: placePack.shortNotice || placePack.shortBody || seed.placeShort || "",
    detail: placePack.detailBody || seed.placeDetail || "",
    charCount: countNoSpace(
      [placePack.shortNotice, placePack.detailBody].filter(Boolean).join("")
    ),
    qualityScore: placePack._meta?.placeExpertPanel?.score ?? seed.qualityScore ?? 90,
  };
}

export function toLandingInstaUi(instaPack = {}, seed = {}) {
  const body =
    instaPack.lineBreakBody ||
    instaPack.body ||
    seed.instaBody ||
    "";
  return {
    body,
    charCount: countNoSpace(body),
    qualityScore: instaPack._meta?.instagramExpertPanel?.score ?? seed.qualityScore ?? 90,
  };
}

/**
 * @param {import("@/lib/publicTest/publicTestSamples").PublicTestSample} sample
 * @param {object} blogPack
 */
export function buildPublicTestChannelPacks(sample = {}, blogPack = {}) {
  const { place, instagram } = buildChannelPacksFromBlog(
    { ...sample, publicTestMode: true },
    blogPack
  );
  return { place, instagram };
}
