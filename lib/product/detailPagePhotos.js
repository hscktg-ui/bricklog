/**
 * 사용자 사진을 섹션에 한 장씩 배치. 같은 사진을 반복하지 않음.
 * 이미지 생성 없음 — 올린 파일만. 순서는 페이지 위→아래.
 */
export const DETAIL_PAGE_MAX_PHOTOS = 5;

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

export function listDetailPagePhotoSlots(sectionTypes = []) {
  return (sectionTypes || [])
    .filter((type) => PHOTO_TYPES.has(type))
    .map((type) => ({ type, label: PHOTO_LABELS[type] || type }));
}

export function assignDetailPagePhotos(sections = [], images = []) {
  const photos = (images || []).filter(Boolean).slice(0, DETAIL_PAGE_MAX_PHOTOS);
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
  };
}
