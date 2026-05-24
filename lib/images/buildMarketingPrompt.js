import { getIndustryStyle } from "./industryStyles";
import { getImageType } from "./imageTypes";

const VARIANT_SUFFIX = {
  default: "",
  alt_style: "Alternative visual style, different art direction, same brand.",
  alt_composition: "Different camera angle and composition, varied framing.",
  alt_color: "Different color grading while keeping brand identity.",
};

/**
 * 블로그·브랜드 맥락으로 마케팅 이미지 프롬프트 조합
 */
export function buildMarketingImagePrompt({
  type = "blog_thumbnail",
  ratio = "16:9",
  industry = "",
  blogTitle = "",
  blogExcerpt = "",
  brandName = "",
  brandColors = [],
  slogan = "",
  basePrompt = "",
  variant = "default",
}) {
  const imageType = getImageType(type);
  const industryStyle = getIndustryStyle(industry);
  const colorHint =
    Array.isArray(brandColors) && brandColors.length
      ? `Brand colors: ${brandColors.slice(0, 4).join(", ")}.`
      : "";
  const sloganHint = slogan ? `Brand slogan mood: ${slogan}.` : "";

  const context = [
    `Marketing image for Korean local business: ${brandName || "local brand"}.`,
    `Image type: ${imageType.label} (${type}), aspect ${ratio}.`,
    industry && `Industry: ${industry}. Style: ${industryStyle.palette}. Mood: ${industryStyle.mood}.`,
    blogTitle && `Blog topic: ${blogTitle}.`,
    blogExcerpt && `Context: ${blogExcerpt.slice(0, 280)}.`,
    colorHint,
    sloganHint,
    industryStyle.props && `Props: ${industryStyle.props}.`,
    "High quality commercial photography, no watermark, text-safe margins.",
    "No stock clichés, authentic Korean storefront aesthetic.",
    VARIANT_SUFFIX[variant] || VARIANT_SUFFIX.default,
  ]
    .filter(Boolean)
    .join(" ");

  if (basePrompt?.trim()) {
    return `${basePrompt.trim()}. ${context}`;
  }
  return context;
}

export function pickPromptFromPack(imagePack, typeId) {
  if (!imagePack) return "";
  const imageType = getImageType(typeId);
  return (
    imagePack[imageType.promptKey] ||
    imagePack.thumbnailPrompt ||
    imagePack.bannerPrompt ||
    ""
  );
}
