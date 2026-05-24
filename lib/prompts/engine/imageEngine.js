import { getChannelStyle } from "./channelStyles";
import { getSeasonHint } from "./seasonHints";
import { enrichImagePack } from "./enrichOutput";

function buildNegative(flavor, style) {
  const parts = [
    "watermark",
    "text overlay clutter",
    "stock photo feel",
    "oversaturated",
    style.avoid,
    ...(flavor.forbidden || []).slice(0, 3),
  ];
  return [...new Set(parts)].join(", ");
}

function toneLighting(tone) {
  const map = {
    emotional: "soft warm natural light, gentle shadows",
    premium: "controlled premium lighting, minimal shadows, editorial",
    informative: "even bright daylight, neutral white balance",
    lifestyle: "natural window light, casual lifestyle",
    medical: "clean bright daylight, calm neutral tones, no clinical drama",
  };
  return map[tone.value] || map.lifestyle;
}

/**
 * Midjourney / DALL·E 수준 이미지 프롬프트팩
 */
export function buildImagePromptPack(ctx, flavor, tone) {
  const style = getChannelStyle(
    ctx.flavor?.legacyKey || ctx.industryKey,
    "image"
  );
  const season = getSeasonHint();
  const neg = buildNegative(flavor, style);
  const light = toneLighting(tone);
  const products = ctx.products || flavor.productWord;
  const region = ctx.region;
  const main = ctx.main;
  const brand = ctx.brandName;

  const common = [
    "Korean local business marketing photography",
    "natural daylight",
    "white tone dominant",
    "premium but approachable",
    "high resolution",
    "no watermark",
    "text safe margin 15%",
    light,
    style.palette,
    style.mood,
    `${season.label} season mood`,
  ].join(", ");

  const thumbnailPrompt = [
    "Blog thumbnail hero image, 1:1 square aspect ratio",
    `${region} ${brand}, ${main}`,
    `${flavor.spaceWord} interior or product hero`,
    products,
    common,
    "copy space top 20% for Korean title overlay",
    `Negative: ${neg}`,
  ].join(". ");

  const placeImagePrompt = [
    "Naver Smart Place listing cover image, 1:1 square aspect ratio",
    `${region} storefront or welcoming entrance`,
    `${brand} trustworthy local business`,
    products,
    "trust-first composition, clear signage area optional",
    common,
    "Smart Place style, clean and inviting",
    `Negative: ${neg}`,
  ].join(". ");

  const instagramCardPrompt = [
    "Instagram feed card, 4:5 vertical aspect ratio",
    `${main} lifestyle mood`,
    flavor.moodWords.join(", "),
    `${flavor.spaceWord} detail shot`,
    "subtle lifestyle props, Korean cafe/shop aesthetic",
    common,
    "copy space bottom 25% for caption overlay",
    `Negative: ${neg}`,
  ].join(". ");

  const bannerPrompt = [
    "Web banner / Naver blog header, 21:9 wide",
    `${region} ${main} seasonal promotion`,
    `${season.mood} atmosphere`,
    brand,
    products,
    common,
    "wide negative space left for typography",
    `Negative: ${neg}`,
  ].join(". ");

  return enrichImagePack(
    {
      thumbnailPrompt,
      placeImagePrompt,
      instagramCardPrompt,
      bannerPrompt,
      thumbnail: thumbnailPrompt,
      placeImage: placeImagePrompt,
      instagramCard: instagramCardPrompt,
      _meta: {
        channel: "image",
        industry: ctx.industryKey,
        tone: tone.label,
        mockOutput: true,
      },
    },
    ctx
  );
}
