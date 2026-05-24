export const industryMeta = {
  key: "hospital",
  label: "병원",
  keywords: ["병원", "의원", "클리닉", "치과", "한의원", "피부과", "성형", "hospital", "clinic"],
  traits: ["신뢰형", "정보형", "과장 금지", "의료광고 최소화"],
};

export function buildBlog(ctx, purpose, tone) {
  return `${ctx.region} ${ctx.industryLabel} — 방문 전 알아두실 정보

${purpose.blogLead}
본 내용은 일반적인 안내이며, 개인별 진료는 내원 상담이 필요합니다.

${ctx.region} ${ctx.industryLabel}입니다.
${tone.voice} 정리했습니다. (의료광고성 과장 표현 없음)

■ 안내 목적
${purpose.label} · ${ctx.purposeDetail}
검색 키워드: ${ctx.main} / ${ctx.subLine}

■ ${purpose.blogSection2}
• 진료 과목·대표 상담 흐름 (일반 안내)
• 내원 전 준비·예약 방법
• ${ctx.region}에서 ${ctx.main} 관련해 자주 문의하시는 내용

■ 참고 사항
증상과 치료 계획은 개인차가 있습니다.
정확한 판단은 직접 상담을 통해 안내받으시길 권해 드립니다.

문의: 대표전화·예약 채널 확인

${tone.ending}

— BRICLOG · 병원 Prompt Engine`;
}

export function buildSmartplace(ctx, purpose, tone) {
  return `${purpose.placeHook}

📍 ${ctx.region} | ${ctx.industryLabel}

${tone.voice} 전달드립니다.

[안내 요약]
${ctx.purposeDetail}

• 위치: ${ctx.region}
• 키워드: ${ctx.main}, ${ctx.subLine}
• 예약·문의: 플레이스 전화/채팅

※ 개별 진료·비용은 내원 상담 시 안내

${purpose.cta}`;
}

export function buildInsta(ctx, purpose, tone) {
  return `${purpose.instaHook}

${ctx.region} ${ctx.industryLabel}
키워드: ${ctx.main}

내원 전 궁금한 점만 짧게 정리했습니다.
${ctx.subLine}

${tone.instaStyle}
(치료 효과 단정·비교 광고 표현 없음)

예약·문의 DM 가능

#${ctx.main.replace(/\s+/g, "")} #${ctx.region.replace(/\s+/g, "")} #건강정보`;
}

export function buildHashtag(ctx) {
  const tags = [
    ctx.main,
    ...ctx.subList,
    ctx.region,
    "병원예약",
    "건강관리",
    "의료정보",
    "지역의원",
    "브릭로그",
  ];
  return `병원·의원 해시태그 (광고성 과장 태그 지양)

${tags
  .filter((t, i, a) => t && a.indexOf(t) === i)
  .slice(0, 12)
  .map((t) => `#${String(t).replace(/[^\w가-힣]/g, "")}`)
  .join(" ")}

권장: 지역+진료과목 조합 위주`;
}

export function buildImagePrompt(ctx, tone) {
  return `[이미지 프롬프트 — 병원/의원]

Clean modern clinic waiting area in ${ctx.region},
soft neutral lighting, trustworthy and calm atmosphere,
${tone.label}, minimal decoration, professional medical interior,
no exaggerated before-after, no promotional text overlay,
realistic documentary style, 4:5

Negative: flower shop romantic, cafe cozy, party, flash sale banners`;
}

export const prompts = {
  blog: buildBlog,
  smartplace: buildSmartplace,
  insta: buildInsta,
  hashtag: buildHashtag,
  imagePrompt: buildImagePrompt,
};
