/**
 * 사용자 사진을 섹션에 한 장씩 배치. 같은 사진을 반복하지 않음.
 * 이미지 생성 없음 — 올린 파일만. 순서는 페이지 위→아래. 캡션은 선택.
 */
export const DETAIL_PAGE_MAX_PHOTOS = 8;

export const DETAIL_PAGE_PHOTO_SLOTS = [
  { type: "hero", label: "맨 위" },
  { type: "explain", label: "설명" },
  { type: "intent", label: "고를 때" },
  { type: "feature", label: "자세히" },
  { type: "scene", label: "장면" },
  { type: "observe", label: "관찰" },
  { type: "usp", label: "왜 이 상품" },
];

const PHOTO_LABELS = Object.fromEntries(
  DETAIL_PAGE_PHOTO_SLOTS.map((slot) => [slot.type, slot.label])
);
const PHOTO_TYPES = new Set(DETAIL_PAGE_PHOTO_SLOTS.map((slot) => slot.type));

export function normalizeDetailPagePhoto(item) {
  if (!item) return null;
  if (typeof item === "string") {
    const src = item.trim();
    return src ? { src, caption: "" } : null;
  }
  const src = String(item.src || item.url || "").trim();
  if (!src) return null;
  return {
    src,
    caption: String(item.caption || "").trim().slice(0, 80),
  };
}

export function normalizeDetailPagePhotos(images = []) {
  return (images || [])
    .map(normalizeDetailPagePhoto)
    .filter(Boolean)
    .slice(0, DETAIL_PAGE_MAX_PHOTOS);
}

export function detailPagePhotoSrcList(images = []) {
  return normalizeDetailPagePhotos(images).map((p) => p.src);
}

export function detailPagePhotoCaptions(images = []) {
  return normalizeDetailPagePhotos(images)
    .map((p) => p.caption)
    .filter(Boolean);
}

export function listDetailPagePhotoSlots(sectionTypes = []) {
  return (sectionTypes || [])
    .filter((type) => PHOTO_TYPES.has(type))
    .map((type) => ({ type, label: PHOTO_LABELS[type] || type }));
}

export function assignDetailPagePhotos(sections = [], images = []) {
  const list = normalizeDetailPagePhotos(images);
  const photos = list.map((p) => p.src);
  const captions = Object.fromEntries(list.map((p) => [p.src, p.caption]));
  const slots = listDetailPagePhotoSlots((sections || []).map((s) => s.type));
  const byType = {};
  let i = 0;
  for (const slot of slots) {
    if (i >= photos.length) break;
    byType[slot.type] = photos[i];
    i += 1;
  }
  return {
    byType,
    leftovers: photos.slice(i),
    placed: i,
    slots,
    captions,
  };
}
