import {
  buildPlaceContent,
  buildPlaceFromBlog,
} from "@/styles/channels/placeStyle";

/**
 * 스마트플레이스 — 사장님 공지형 (블로그 요약 아님)
 */
export function buildPlacePack(ctx, flavor, purpose, tone) {
  return buildPlaceContent({
    ctx,
    flavor,
    purpose,
    tone,
    insights: ctx.blogInsights || null,
  });
}

export { buildPlaceFromBlog };
