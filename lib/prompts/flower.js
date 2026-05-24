export const industryMeta = {
  key: "flower",
  label: "꽃집",
  keywords: ["꽃", "플라워", "flower", "화환", "부케", "꽃집", "플로리스트"],
  traits: ["감성형", "시즌성", "선물 맥락", "생활형 말투"],
};

/**
 * @param {import('@/utils/promptBuilder').PromptContext} ctx
 * @param {ReturnType<import('./purposeModifiers').getPurposeModifier>} purpose
 * @param {ReturnType<import('./toneModifiers').getToneModifier>} tone
 */
export function buildBlog(ctx, purpose, tone) {
  return `${ctx.region} ${ctx.main} — 꽃다운 하루를 전하는 글

${purpose.blogLead}
${tone.voice} 적었습니다.

안녕하세요, ${ctx.region} ${ctx.industryLabel}입니다.
꽃은 특별한 날의 마음을 대신 전해 주는 작은 편지 같아요.

🌸 이번 글의 마음
목적: ${purpose.label} · ${ctx.purposeDetail}
메인: ${ctx.main} · 서브: ${ctx.subLine}

${purpose.blogSection2}
• 어떤 상황에 어떤 꽃이 어울리는지
• ${ctx.subLine} 키워드로 찾으시는 분들께
• 시즌에 맞는 컬러·꽃재 추천

💐 ${ctx.region}에서 꽃을 고를 때
선물·기념일·집들이…
상황마다 분위기가 달라지죠.
과한 광고 말 대신, 그날의 감정에 맞는 선택을 돕는 쪽으로 정리했어요.

${tone.ending}

— BRICLOG · 꽃집 Prompt Engine`;
}

export function buildSmartplace(ctx, purpose, tone) {
  return `${purpose.placeHook}

📍 ${ctx.region} | ${ctx.industryLabel}

${ctx.region} 근처에서 ${ctx.main}을(를) 찾고 계신가요?
${tone.voice} 안내드립니다.

🌷 시즌 소식
${ctx.purposeDetail}
${ctx.subLine} 관련 문의 환영해요.

예약·상담은 플레이스 메시지로 편하게 남겨 주세요.
${purpose.cta}`;
}

export function buildInsta(ctx, purpose, tone) {
  return `${purpose.instaHook} 🌸

${ctx.region} ${ctx.industryLabel}
${ctx.main}

마음 전할 때 꽃이면 충분할 때가 있어요
${ctx.subLine}

${tone.instaStyle}
${purpose.cta} 💐

#${ctx.main.replace(/\s+/g, "")} #꽃선물 #${ctx.region.replace(/\s+/g, "")}`;
}

export function buildHashtag(ctx) {
  const tags = [
    ctx.main,
    ...ctx.subList,
    "꽃선물",
    "꽃다발",
    "플라워샵",
    ctx.region,
    "기념일꽃",
    "시즌꽃",
    "브릭로그",
  ];
  return `꽃집 해시태그 추천

${tags
  .filter((t, i, a) => t && a.indexOf(t) === i)
  .slice(0, 14)
  .map((t) => `#${String(t).replace(/[^\w가-힣]/g, "")}`)
  .join(" ")}

💡 시즌·기념일용: #꽃선물 #기념일꽃 #${ctx.main.replace(/\s+/g, "")}`;
}

export function buildImagePrompt(ctx, tone) {
  return `[이미지 프롬프트 — 꽃집]

Soft natural light, ${ctx.region} flower shop interior,
seasonal bouquet arrangement, ${ctx.main}, ${ctx.subLine},
${tone.label} mood, pastel and fresh greens,
gift context, lifestyle photography, shallow depth of field,
4:5 vertical, no harsh ad text

Negative: medical, clinical, dark hospital tone, watermark`;
}

export const prompts = {
  blog: buildBlog,
  smartplace: buildSmartplace,
  insta: buildInsta,
  hashtag: buildHashtag,
  imagePrompt: buildImagePrompt,
};
