export const industryMeta = {
  key: "cafe",
  label: "카페",
  keywords: ["카페", "cafe", "커피", "coffee", "디저트", "베이커리", "브런치", "로스터리"],
  traits: ["분위기", "공간감", "감성형", "MZ 느낌"],
};

export function buildBlog(ctx, purpose, tone) {
  return `${ctx.region} ${ctx.main} — 요즘 찾는 카페 이야기

${purpose.blogLead}
${tone.voice} 남겨봤어요.

${ctx.region} ${ctx.industryLabel},
분위기 좋은 곳 찾다 보면
${ctx.main} 검색하시는 분들 많으시죠.

☕ 오늘의 포인트
${purpose.label} · ${ctx.purposeDetail}
${ctx.subLine}

${purpose.blogSection2}
• 공간 분위기·좌석 타입
• 시그니처 메뉴 / 사진 찍기 좋은 스팟
• ${ctx.region}에서 데이트·작업하기 괜찮은지

솔직히 말하면
광고 문구보다
“여기 앉아 있으면 기분이 어떤지”가 더 중요하잖아요.

한잔 하러 오실 때 참고만 해 주세요.

${tone.ending}

— BRICLOG · 카페 Prompt Engine`;
}

export function buildSmartplace(ctx, purpose, tone) {
  return `${purpose.placeHook}

📍 ${ctx.region} | ${ctx.industryLabel}

${ctx.main} 찾는 분들께 ✨

${ctx.purposeDetail}
${ctx.subLine}

매장 분위기·메뉴는 플레이스 사진 참고!
단체·작업석 문의는 메시지 주세요.

${purpose.cta}`;
}

export function buildInsta(ctx, purpose, tone) {
  return `${purpose.instaHook} ☕️

${ctx.region} vibe check
${ctx.industryLabel} · ${ctx.main}

${ctx.subLine}
사진보다 현장이 반티나 더 예쁨 (진심)

${tone.instaStyle}
저장해두고 가세요 📌

#카페스타그램 #${ctx.main.replace(/\s+/g, "")} #${ctx.region.replace(/\s+/g, "")} #카공`;
}

export function buildHashtag(ctx) {
  const tags = [
    ctx.main,
    ...ctx.subList,
    "카페스타그램",
    "카페투어",
    "감성카페",
    "브런치",
    ctx.region,
    "카공",
    "디저트",
    "브릭로그",
  ];
  return `카페 해시태그 MZ 세트

${tags
  .filter((t, i, a) => t && a.indexOf(t) === i)
  .slice(0, 14)
  .map((t) => `#${String(t).replace(/[^\w가-힣]/g, "")}`)
  .join(" ")}

조합 팁: #${ctx.main.replace(/\s+/g, "")} + #${ctx.region.replace(/\s+/g, "")} + #카페투어`;
}

export function buildImagePrompt(ctx, tone) {
  return `[이미지 프롬프트 — 카페]

Aesthetic cafe interior in ${ctx.region},
${ctx.main}, ${ctx.subLine},
${tone.label} mood, MZ generation style,
latte art on wooden table, soft window light,
cozy corners for instagram, 4:5 vertical

Negative: hospital sterile, furniture warehouse wide shot, flower bouquet shop`;
}

export const prompts = {
  blog: buildBlog,
  smartplace: buildSmartplace,
  insta: buildInsta,
  hashtag: buildHashtag,
  imagePrompt: buildImagePrompt,
};
