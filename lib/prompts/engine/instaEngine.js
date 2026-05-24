import {
  buildInstagramContent,
  buildInstagramFromBlog,
} from "@/styles/channels/instagramStyle";

/**
 * 인스타그램 — 저장형 캡션 (2025~2026 로컬 감성)
 */
export function buildInstaPack(ctx, flavor, purpose, tone) {
  return buildInstagramContent({
    ctx,
    flavor,
    purpose,
    tone,
    toneKey: tone?.value || ctx.toneKey || "emotional",
    insights: ctx.blogInsights || null,
  });
}

export { buildInstagramFromBlog };
