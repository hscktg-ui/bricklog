export const industryMeta = {
  key: "furniture",
  label: "가구",
  keywords: ["가구", "인테리어", "furniture", "소파", "침대", "리퍼브", "가구매장", "홈퍼니싱"],
  traits: ["체험형", "프리미엄", "방문 유도", "공간감 강조"],
};

export function buildBlog(ctx, purpose, tone) {
  return `${ctx.region} ${ctx.main} — 공간이 바뀌면 일상이 바뀝니다

${purpose.blogLead}
${tone.voice} 썼습니다.

${ctx.region} ${ctx.industryLabel}입니다.
가구는 크기·소재·동선까지 직접 보고 결정하는 경우가 많습니다.

◆ 이번 콘텐츠
${purpose.label} · ${ctx.purposeDetail}
키워드 ${ctx.main} · ${ctx.subLine}

◆ ${purpose.blogSection2}
• 매장에서 체험할 때 체크할 포인트
• 공간 크기별 추천 스타일
• ${ctx.subLine} 검색 고객님께 드리는 팁

◆ 방문이 더 좋은 이유
사진만으로는 담기지 않는
재질감·착석감·색감을
매장에서 확인하실 수 있습니다.

${ctx.region} 방문·상담 예약 환영합니다.

${tone.ending}

— BRICLOG · 가구 Prompt Engine`;
}

export function buildSmartplace(ctx, purpose, tone) {
  return `${purpose.placeHook}

📍 ${ctx.region} | ${ctx.industryLabel} 쇼룸

${tone.voice} 안내합니다.

🛋 공간 체험 안내
${ctx.purposeDetail}
메인: ${ctx.main} · ${ctx.subLine}

• 쇼룸 방문 예약 가능
• 동선·배치 상담

${purpose.cta}`;
}

export function buildInsta(ctx, purpose, tone) {
  return `${purpose.instaHook}

${ctx.region} ${ctx.industryLabel}
${ctx.main}

공간 사진보다
직접 발 디딜 때 결정되는 집

${ctx.subLine}
쇼룸 방문 link in bio 🪑

${tone.instaStyle}

#인테리어 #${ctx.main.replace(/\s+/g, "")} #홈스타일링`;
}

export function buildHashtag(ctx) {
  const tags = [
    ctx.main,
    ...ctx.subList,
    "인테리어",
    "홈스타일링",
    "가구스타그램",
    ctx.region,
    "리빙",
    "쇼룸",
    "브릭로그",
  ];
  return `가구·인테리어 해시태그

${tags
  .filter((t, i, a) => t && a.indexOf(t) === i)
  .slice(0, 14)
  .map((t) => `#${String(t).replace(/[^\w가-힣]/g, "")}`)
  .join(" ")}

체험·방문 유도: #쇼룸 #가구매장 #${ctx.region.replace(/\s+/g, "")}`;
}

export function buildImagePrompt(ctx, tone) {
  return `[이미지 프롬프트 — 가구/인테리어]

Spacious furniture showroom in ${ctx.region},
${ctx.main}, premium interior styling,
${tone.label} atmosphere, natural wood and fabric textures,
wide angle emphasizing room scale and layout,
warm ambient light, lifestyle catalog quality, 4:5

Negative: hospital, clinical, small cafe table only, bouquet close-up`;
}

export const prompts = {
  blog: buildBlog,
  smartplace: buildSmartplace,
  insta: buildInsta,
  hashtag: buildHashtag,
  imagePrompt: buildImagePrompt,
};
