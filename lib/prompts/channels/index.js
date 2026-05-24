/**
 * 채널별 스펙·빌더 — 업종×목적×톤 컨텍스트 → 채널팩
 */
import { buildBlogPack } from "./blog";
import { buildHashtagPack } from "./hashtag";
import { buildImagePromptPack } from "./image";
import { buildInstaPack } from "./instagram";
import { buildPlacePack } from "./place";

export { buildBlogPack } from "./blog";
export { buildPlacePack } from "./place";
export { buildInstaPack } from "./instagram";
export { buildHashtagPack, flattenHashtagPack } from "./hashtag";
export { buildImagePromptPack } from "./image";

export const CHANNEL_SPECS = {
  blog: {
    id: "blog",
    label: "블로그 본문",
    goal: "체류·지역 SEO·네이버 블로그",
    bodyMin: 2000,
    bodyMax: 2800,
    mainKeywordMin: 6,
    mainKeywordMax: 8,
  },
  smartplace: {
    id: "smartplace",
    label: "플레이스 소식",
    goal: "클릭·방문·예약",
    titleMin: 18,
    titleMax: 32,
    detailMin: 250,
    detailMax: 450,
  },
  instagram: {
    id: "instagram",
    label: "인스타 바디",
    goal: "저장·감성",
    bodyMin: 500,
    bodyMax: 900,
  },
  hashtag: {
    id: "hashtag",
    label: "해시태그",
    goal: "지역·SEO·브랜드·트렌드·시즌",
  },
  image: {
    id: "image",
    label: "이미지 프롬프트",
    goal: "브랜드 톤 맞춤 비주얼",
  },
};

export const channelBuilders = {
  blog: (ctx) =>
    buildBlogPack(ctx, ctx.flavor, ctx.articleType, ctx.purpose, ctx.tone),
  smartplace: (ctx) =>
    buildPlacePack(ctx, ctx.flavor, ctx.purpose, ctx.tone),
  instagram: (ctx) =>
    buildInstaPack(ctx, ctx.flavor, ctx.purpose, ctx.tone),
  hashtag: (ctx) =>
    buildHashtagPack(ctx, ctx.flavor, ctx.purpose, ctx.articleType),
  image: (ctx) => buildImagePromptPack(ctx, ctx.flavor, ctx.tone),
};

export function buildChannel(channelId, ctx) {
  const fn = channelBuilders[channelId];
  if (!fn) return null;
  return fn(ctx);
}

export function buildAllChannels(ctx) {
  return {
    blog: buildChannel("blog", ctx),
    smartplace: buildChannel("smartplace", ctx),
    insta: buildChannel("instagram", ctx),
    hashtag: buildChannel("hashtag", ctx),
    imagePrompt: buildChannel("image", ctx),
  };
}
