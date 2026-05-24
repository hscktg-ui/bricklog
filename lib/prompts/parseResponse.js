import { filterBlogPack, buildForbiddenList } from "@/utils/filterForbiddenWords";
import { checkBlogQuality } from "@/utils/qualityCheck";

/**
 * OpenAI JSON 응답 파싱 (마크다운·설명 제거)
 */
export function parseOpenAIJson(raw) {
  if (raw == null) return null;
  if (typeof raw === "object") return raw;

  let text = String(raw).trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    text = text.slice(start, end + 1);
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function validateContentPack(data) {
  if (!data || typeof data !== "object") return false;
  return Boolean(data.blog?.sections?.length && data.smartplace?.title);
}

/** OpenAI 블로그 응답 후처리 — 금지어·undefined 제거 */
export function normalizeBlogFromAI(blog, ctx = {}) {
  if (!blog) return null;
  const forbidden = buildForbiddenList(ctx);
  let pack = filterBlogPack(
    {
      ...blog,
      representativeTitle: blog.representativeTitle || blog.title,
      title: blog.representativeTitle || blog.title,
    },
    forbidden
  );
  const quality = checkBlogQuality(pack, ctx);
  pack._meta = { ...blog._meta, quality };
  return pack;
}
