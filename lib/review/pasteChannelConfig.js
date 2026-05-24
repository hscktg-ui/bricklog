/** 붙여넣기 검수 — 채널별 UI·검증 기준 */

export const PASTE_REVIEW_CHANNELS = [
  {
    id: "blog",
    label: "블로그",
    shortLabel: "블로그",
    desc: "네이버형 장문 · 제목+본문",
    auditMinChars: 40,
    improveMinChars: 80,
    apiChannel: "blog",
  },
  {
    id: "place",
    label: "플레이스",
    shortLabel: "플레이스",
    desc: "한 줄 공지 · 운영 안내",
    auditMinChars: 30,
    improveMinChars: 60,
    apiChannel: "place",
  },
  {
    id: "instagram",
    label: "인스타 캡션",
    shortLabel: "인스타",
    desc: "피드·릴스 캡션 · 줄바꿈",
    auditMinChars: 20,
    improveMinChars: 40,
    apiChannel: "instagram",
  },
];

export function getPasteReviewChannel(id) {
  return (
    PASTE_REVIEW_CHANNELS.find((c) => c.id === id) || PASTE_REVIEW_CHANNELS[0]
  );
}

/**
 * @param {'blog'|'place'|'instagram'} channelId
 * @param {object} fields
 */
export function buildPasteReviewText(channelId, fields = {}) {
  if (channelId === "place") {
    const title = String(fields.placeTitle || "").trim();
    const short = String(fields.placeShort || "").trim();
    const detail = String(fields.placeDetail || "").trim();
    const parts = [];
    if (title) parts.push(title);
    if (short) parts.push(short);
    if (detail && detail !== short) parts.push(detail);
    return parts.join("\n\n");
  }
  if (channelId === "instagram") {
    const caption = String(fields.instaCaption || "").trim();
    const tags = String(fields.instaTags || "").trim();
    if (!caption) return tags;
    if (!tags) return caption;
    return `${caption}\n\n${tags}`;
  }
  const title = String(fields.draftTitle || "").trim();
  const body = String(fields.draftBody || "").trim();
  if (title && body) return `${title}\n\n${body}`;
  return title || body;
}
