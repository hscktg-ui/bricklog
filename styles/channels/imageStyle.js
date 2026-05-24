/**
 * 이미지 채널 스타일 스펙
 */
export const IMAGE_CHANNEL = {
  id: "image",
  goal: "브랜드 톤 맞춤 마케팅 비주얼",
  tone: "화이트톤·자연광·텍스트 여백",
  sentenceStyle: "english-prompt",
  lighting: "natural daylight",
  textMargin: "15%",
  emojiMax: 0,
  banned: ["watermark", "stock photo", "oversaturated"],
};

export function getImageChannelBrief(ctx) {
  return [
    IMAGE_CHANNEL.goal,
    `업종: ${ctx.industryLabel || "local"}`,
    `지역: ${ctx.region}`,
    `브랜드: ${ctx.brandName || "(생략)"}`,
    "Negative clause required",
  ].join(" · ");
}
