/**
 * 사용자 사진을 섹션에 한 장씩 배치. 같은 사진을 반복하지 않음.
 * 이미지 생성 없음 — 올린 파일만. 컷 연출은 슬롯·크롭·순서로.
 */
export const DETAIL_PAGE_MAX_PHOTOS = 8;

/** 연출컷을 AI로 그리지 않는다. 올린 사진을 이 컷으로 연출한다. */
export const DETAIL_PAGE_PHOTO_DIRECTION = {
  hero: { shot: "포장 앞면", hint: "세로 · 전체가 보이게", height: 680, plate: "01" },
  intent: { shot: "고를 때 보는 면", hint: "멈추는 그 장면", height: 440, plate: "02" },
  explain: { shot: "이유 한 장", hint: "설명과 같이 읽히게", height: 440, plate: "03" },
  usp: { shot: "차이 한 점", hint: "카드 위에 얹히게", height: 440, plate: "04" },
  observe: { shot: "손에 쥐거나 가까이", hint: "정사각에 가깝게", height: 520, plate: "05" },
  feature: { shot: "디테일 한 점", hint: "가로 · 한 부분만", height: 480, plate: "06" },
  scene: { shot: "쓰는 장면", hint: "식탁·현장", height: 520, plate: "07" },
};

export const DETAIL_PAGE_PHOTO_SLOTS = [
  { type: "hero", label: "맨 위" },
  { type: "explain", label: "설명" },
  { type: "intent", label: "고를 때" },
  { type: "feature", label: "자세히" },
  { type: "scene", label: "장면" },
  { type: "observe", label: "관찰" },
  { type: "usp", label: "왜 이 상품" },
];

export function getDetailPagePhotoDirection(type) {
  return (
    DETAIL_PAGE_PHOTO_DIRECTION[type] || {
      shot: "상품 사진",
      hint: "",
      height: 440,
      plate: "00",
    }
  );
}

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
    .map((type, i) => {
      const dir = getDetailPagePhotoDirection(type);
      return {
        type,
        label: dir.shot || PHOTO_LABELS[type] || type,
        n: String(i + 1).padStart(2, "0"),
        shot: dir.shot,
        hint: dir.hint,
        height: dir.height,
      };
    });
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
