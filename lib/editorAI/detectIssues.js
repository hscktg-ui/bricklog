import { detectPlaceholders, validateBlogPackIntegrity } from "@/lib/integrity/templateIntegrity";
import { detectRepeatedSentences } from "@/utils/detectRepeatedSentences";
import { detectGPTTone } from "@/utils/detectGPTTone";
import { detectKeywordStuffing } from "@/utils/detectKeywordStuffing";
import { detectBrandLeak } from "@/utils/detectBrandLeak";
import { detectLocationLeak } from "@/utils/detectLocationLeak";
import { detectParticleErrors } from "@/utils/detectParticleErrors";
import { buildForbiddenList, containsForbidden } from "@/utils/filterForbiddenWords";
import { getBlogFullText } from "@/utils/qualityCheck";
import { countBlogBodyChars, countChars } from "@/lib/prompts/engine/textUtils";
import { BLOG_MIN_BODY_CHARS } from "@/lib/constants";

function extractText(channel, content) {
  if (!content) return "";
  if (channel === "blog") return getBlogFullText(content);
  if (channel === "place") {
    return [content.title, content.shortNotice, content.shortBody, content.detailBody, content.cta]
      .filter(Boolean)
      .join("\n");
  }
  if (channel === "instagram") {
    return [content.hook, content.body, content.ending, content.lineBreakBody]
      .filter(Boolean)
      .join("\n");
  }
  if (channel === "image") {
    return [
      content.thumbnailPrompt,
      content.placeImagePrompt,
      content.instagramCardPrompt,
      content.bannerPrompt,
      content.fullCopyText,
    ]
      .filter(Boolean)
      .join("\n");
  }
  return String(content);
}

export function detectContentIssues(channel, content, ctx = {}) {
  const text = extractText(channel, content);
  const issues = [];
  const ph = detectPlaceholders(text);
  if (ph.length) {
    issues.push({ id: "placeholder", severity: "fail", message: "Placeholder·오류 문자 발견" });
  }
  if (/\bundefined\b|\bnull\b|\bNaN\b/i.test(text)) {
    issues.push({ id: "junk", severity: "fail", message: "undefined/null 출력" });
  }

  const repeat = detectRepeatedSentences(text);
  if (repeat.hasRepeat) {
    issues.push({ id: "repeat", severity: "fail", message: "동일·유사 문장 반복" });
  }

  const gpt = detectGPTTone(text);
  if (gpt.hasGptTone) {
    issues.push({ id: "gpt", severity: "warn", message: "GPT 말투 패턴" });
  }

  const kw = detectKeywordStuffing(text, ctx.main);
  if (kw.stuffed) {
    issues.push({ id: "keyword_stuff", severity: "fail", message: "키워드 과삽입" });
  }

  const brand = detectBrandLeak(text, ctx.brandName);
  if (brand.hasLeak) {
    issues.push({ id: "brand_leak", severity: "fail", message: `다른 브랜드명: ${brand.brands.join(", ")}` });
  }

  const loc = detectLocationLeak(text, ctx.region);
  if (loc.hasLeak) {
    issues.push({ id: "region_leak", severity: "fail", message: `무관 지역: ${loc.regions.join(", ")}` });
  }

  const particle = detectParticleErrors(text, ctx.brandName);
  if (particle.hasError) {
    issues.push({ id: "particle", severity: "warn", message: "조사 오류 가능" });
  }

  const forbidden = buildForbiddenList(ctx);
  if (containsForbidden(text, forbidden)) {
    issues.push({ id: "forbidden", severity: "fail", message: "금지어 포함" });
  }

  if (channel === "blog") {
    const chars = countBlogBodyChars(content);
    if (chars < BLOG_MIN_BODY_CHARS) {
      issues.push({
        id: "blog_length",
        severity: "fail",
        message: `본문 ${chars}자 (${BLOG_MIN_BODY_CHARS}자 미만)`,
      });
    }
    const integrity = validateBlogPackIntegrity(content, ctx);
    if (!integrity.ok) {
      issues.push({ id: "integrity", severity: "fail", message: "템플릿 무결성 오류" });
    }
  }

  if (channel === "place") {
    const total =
      countChars(content?.shortBody || content?.shortNotice) +
      countChars(content?.detailBody || "");
    if (total > 500) {
      issues.push({ id: "place_long", severity: "warn", message: "플레이스 분량 과다" });
    }
    if (/알아보시다|체류|SEO|키워드|검색창/.test(text)) {
      issues.push({ id: "place_blog_tone", severity: "warn", message: "블로그체 혼입" });
    }
  }

  if (channel === "instagram") {
    if ((content?.hook || "").length < 8) {
      issues.push({ id: "insta_hook", severity: "warn", message: "Hook 부족" });
    }
    if (/소개해드릴|검색창|체크리스트|정리하자면/.test(text)) {
      issues.push({ id: "insta_explain", severity: "warn", message: "설명형 문체" });
    }
  }

  const fail = issues.filter((i) => i.severity === "fail");
  return {
    issues,
    pass: fail.length === 0,
    failCount: fail.length,
    text,
  };
}
