import { parseOpenAIJson, validateContentPack } from "./parseResponse";
import { normalizeBlogFromAI } from "./parseResponse";
import { detectGptTone, scrubGptToneDeep } from "@/utils/gptToneScrubber";
import { countBlogBodyChars } from "@/lib/prompts/engine/textUtils";

const MIN_BLOG_CHARS = 1200;

function repairTruncatedJson(text) {
  let t = String(text || "").trim();
  const open = (t.match(/\{/g) || []).length;
  const close = (t.match(/\}/g) || []).length;
  if (open > close) t += "}".repeat(open - close);
  return t;
}

function scrubPackDeep(pack) {
  if (!pack?.blog) return pack;
  const blog = pack.blog;
  blog.representativeTitle = scrubGptToneDeep(blog.representativeTitle || blog.title || "");
  blog.sections = (blog.sections || []).map((s) => ({
    heading: scrubGptToneDeep(s.heading || ""),
    body: scrubGptToneDeep(s.body || ""),
  }));
  blog.conclusion = scrubGptToneDeep(blog.conclusion || "");
  if (pack.smartplace) {
    pack.smartplace.title = scrubGptToneDeep(pack.smartplace.title || "");
    pack.smartplace.shortBody = scrubGptToneDeep(pack.smartplace.shortBody || "");
    pack.smartplace.detailBody = scrubGptToneDeep(pack.smartplace.detailBody || "");
  }
  if (pack.instagram) {
    pack.instagram.hook = scrubGptToneDeep(pack.instagram.hook || "");
    pack.instagram.body = scrubGptToneDeep(pack.instagram.body || "");
  }
  return pack;
}

/**
 * OpenAI 응답 안정화 — JSON 파싱·검증·GPT 말투·길이 보정
 * @param {string|object} raw
 * @param {object} ctx
 * @param {{ maxAttempts?: number }} opts
 */
export async function stabilizeOpenAIResponse(raw, ctx = {}, opts = {}) {
  const maxAttempts = opts.maxAttempts ?? 2;
  let lastError = "parse_failed";
  let candidate = typeof raw === "object" ? raw : null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (!candidate && typeof raw === "string") {
      const repaired = attempt > 0 ? repairTruncatedJson(raw) : raw;
      candidate = parseOpenAIJson(repaired);
    }

    if (!candidate || !validateContentPack(candidate)) {
      lastError = "invalid_pack";
      candidate = null;
      continue;
    }

    const blog = normalizeBlogFromAI(candidate.blog, ctx);
    if (!blog?.sections?.length) {
      lastError = "empty_blog";
      candidate = null;
      continue;
    }

    const chars = countBlogBodyChars(blog);
    const gpt = detectGptTone(
      blog.sections.map((s) => s.body).join("\n")
    );

    if (chars < MIN_BLOG_CHARS) lastError = "short_body";
    if (gpt.hasGptTone) lastError = "gpt_tone";

    candidate = scrubPackDeep({ ...candidate, blog });
    candidate.blog = blog;

    if (chars >= MIN_BLOG_CHARS && !gpt.hasGptTone) {
      return { ok: true, data: candidate, attempts: attempt + 1 };
    }

    if (attempt < maxAttempts - 1 && opts.regenerate) {
      const next = await opts.regenerate({ reason: lastError, attempt });
      raw = next;
      candidate = null;
      continue;
    }

    return {
      ok: chars >= 900,
      data: candidate,
      attempts: attempt + 1,
      warning: lastError,
    };
  }

  return { ok: false, data: null, attempts: maxAttempts, error: lastError };
}
