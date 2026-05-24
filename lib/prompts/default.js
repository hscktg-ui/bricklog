export const industryMeta = {
  key: "default",
  label: "일반 업종",
  keywords: [],
  traits: ["범용", "로컬 비즈니스", "정보 전달"],
};

export function buildBlog(ctx, purpose, tone) {
  return `${ctx.region} ${ctx.industryLabel} — ${ctx.main}

${purpose.blogLead}
${tone.voice} 작성했습니다.

■ 개요
${ctx.purposeDetail}
키워드: ${ctx.main} · ${ctx.subLine}

■ ${purpose.blogSection2}
${ctx.region}에서 ${ctx.main}을(를) 찾는 분들께
도움이 될 만한 내용을 정리했습니다.

${tone.ending}

— BRICLOG · Default Prompt`;
}

export function buildSmartplace(ctx, purpose, tone) {
  return `${purpose.placeHook}

📍 ${ctx.region} | ${ctx.industryLabel}

${ctx.purposeDetail}
${ctx.main} · ${ctx.subLine}

${tone.voice} 안내드립니다.
${purpose.cta}`;
}

export function buildInsta(ctx, purpose, tone) {
  return `${purpose.instaHook}

${ctx.region} ${ctx.industryLabel}
${ctx.main}
${ctx.subLine}

${tone.instaStyle}
${purpose.cta}`;
}

export function buildHashtag(ctx) {
  const tags = [ctx.main, ...ctx.subList, ctx.region, "로컬비즈니스", "브릭로그"];
  return tags
    .filter((t, i, a) => t && a.indexOf(t) === i)
    .map((t) => `#${String(t).replace(/[^\w가-힣]/g, "")}`)
    .join(" ");
}

export function buildImagePrompt(ctx, tone) {
  return `Local business in ${ctx.region}, ${ctx.industryLabel},
theme ${ctx.main}, ${tone.label} mood, natural light, 4:5`;
}

export const prompts = {
  blog: buildBlog,
  smartplace: buildSmartplace,
  insta: buildInsta,
  hashtag: buildHashtag,
  imagePrompt: buildImagePrompt,
};
