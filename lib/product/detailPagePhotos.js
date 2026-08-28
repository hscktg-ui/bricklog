/**
 * 상세 사진 — 올린 파일 우선, 빈 칸은 컷별 상품 사진 생성.
 * 가짜 모델컷은 그리지 않는다. 컷 연출은 슬롯·크롭·순서.
 */
export const DETAIL_PAGE_MAX_PHOTOS = 8;

/** 셀러가 고를 때 보는 컷 순서. */
export const DETAIL_PAGE_PHOTO_DIRECTION = {
  hero: { shot: "포장 앞면", hint: "세로 · 전체가 보이게", height: 680, plate: "01", objectPosition: "50% 42%", zoom: 1 },
  intent: { shot: "고를 때 보는 면", hint: "멈추는 그 장면", height: 440, plate: "02", objectPosition: "50% 40%", zoom: 1 },
  explain: { shot: "이유 한 장", hint: "설명과 같이 읽히게", height: 440, plate: "03", objectPosition: "50% 50%", zoom: 1 },
  usp: { shot: "차이 한 점", hint: "카드 위에 얹히게", height: 440, plate: "04", objectPosition: "50% 50%", zoom: 1 },
  observe: { shot: "손에 쥐거나 가까이", hint: "같은 포장 앞면을 가까이 크롭. 손·모델 없음", height: 560, plate: "05", objectPosition: "50% 28%", zoom: 1.62 },
  feature: { shot: "디테일 한 점", hint: "같은 포장의 디테일 크롭. 다른 SKU로 바꾸지 않음", height: 420, plate: "06", objectPosition: "50% 88%", zoom: 1.78 },
  scene: { shot: "쓰는 장면", hint: "식탁·현장", height: 520, plate: "07", objectPosition: "50% 50%", zoom: 1 },
};

export const DETAIL_PAGE_PHOTO_SLOTS = [
  { type: "hero", label: "맨 위" },
  { type: "observe", label: "관찰" },
  { type: "feature", label: "자세히" },
  { type: "scene", label: "장면" },
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
    slot: String(item.slot || item.type || "").trim(),
    generated: item.generated === true,
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
  const captions = Object.fromEntries(list.map((p) => [p.src, p.caption]));
  const slots = listDetailPagePhotoSlots((sections || []).map((s) => s.type));
  const byType = {};
  const unused = [];
  for (const photo of list) {
    if (photo.slot && slots.some((s) => s.type === photo.slot) && !byType[photo.slot]) {
      byType[photo.slot] = photo.src;
    } else {
      unused.push(photo);
    }
  }
  let i = 0;
  for (const slot of slots) {
    if (byType[slot.type]) continue;
    if (i >= unused.length) break;
    byType[slot.type] = unused[i].src;
    i += 1;
  }
  return {
    byType,
    leftovers: unused.slice(i).map((p) => p.src),
    placed: Object.keys(byType).length,
    slots,
    captions,
  };
}
