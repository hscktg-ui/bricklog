/**
 * 상세페이지 이미지 SSOT.
 * 상세는 글이 아니다. 이미지는 두 층이다.
 * 1) 상품 컷 — 피사체가 다른 사진. 이미지 모델은 여기만 그린다.
 * 2) 붙일 화면 — 그 컷 위에 한글·가격·표를 올린 860 스택.
 * 같은 포대를 크롭해 칸을 채우면 컷이 생긴 게 아니다.
 */
import { buildDetailPageCategoryListing } from "@/lib/product/detailPageCategoryFlow";
import { normalizeDetailPagePhotos } from "@/lib/product/detailPagePhotos";

export const DETAIL_PAGE_IMAGE_CONCEPT_VERSION = "detail-image-concept-v1";

export const DETAIL_PAGE_IMAGE_LAYERS = Object.freeze({
  productShots: {
    id: "product_shots",
    name: "상품 컷",
    meaning: "피사체가 다른 상품 사진. 올린 사진을 먼저 쓰고, 빈 피사체만 생성한다.",
    not: ["한글 상세페이지", "가격", "가짜 모델컷", "같은 포대 크롭"],
  },
  mallStack: {
    id: "mall_stack",
    name: "붙일 화면",
    meaning: "860 섹션 PNG. HTML 엔진이 한글·표·CTA를 올린 뒤 칸마다 저장한다.",
    not: ["원샷 통이미지", "이미지 모델에 상세페이지를 시키기"],
  },
});

const SUBJECTS = Object.freeze({
  grocery: [
    { id: "pack", slot: "hero", label: "포장 앞면", required: true },
    { id: "grain", slot: "observe", label: "원물", required: true },
    { id: "label", slot: "feature", label: "라벨", required: true },
    { id: "cooked", slot: "scene", label: "밥", required: false },
  ],
  cafe: [
    { id: "pack", slot: "hero", label: "봉투 앞면", required: true },
    { id: "bean", slot: "observe", label: "원두", required: true },
    { id: "label", slot: "feature", label: "라벨", required: true },
    { id: "brew", slot: "scene", label: "추출", required: false },
  ],
  beauty: [
    { id: "pack", slot: "hero", label: "용기 전체", required: true },
    { id: "texture", slot: "observe", label: "제형", required: true },
    { id: "label", slot: "feature", label: "라벨", required: true },
    { id: "use", slot: "scene", label: "바르는 장면", required: false },
  ],
  appliance: [
    { id: "pack", slot: "hero", label: "제품 전체", required: true },
    { id: "detail", slot: "observe", label: "조작부", required: true },
    { id: "label", slot: "feature", label: "디테일", required: true },
    { id: "use", slot: "scene", label: "사용", required: false },
  ],
  default: [
    { id: "pack", slot: "hero", label: "제품 전체", required: true },
    { id: "detail", slot: "observe", label: "디테일", required: true },
    { id: "label", slot: "feature", label: "가까이", required: true },
    { id: "usage", slot: "scene", label: "사용", required: false },
  ],
});

function srcKey(src) {
  return String(src || "")
    .split("?")[0]
    .replace(/#.*$/, "")
    .trim();
}

export function resolveDetailPageShotBank(input = {}) {
  const listing = buildDetailPageCategoryListing(input);
  if (listing.key === "grocery" || listing.key === "cafe" || listing.key === "beauty" || listing.key === "appliance") {
    return listing.key;
  }
  return "default";
}

export function listDetailPageShotSubjects(input = {}) {
  return SUBJECTS[resolveDetailPageShotBank(input)].map((s) => ({ ...s }));
}

/**
 * @param {{ photos?: object[], html?: string, input?: object, mallStackCount?: number }} args
 */
export function inspectDetailPageImageConcept(args = {}) {
  const input = args.input || {};
  const photos = normalizeDetailPagePhotos(args.photos || input.photos || []);
  const subjects = listDetailPageShotSubjects(input);
  const bySlot = Object.fromEntries(
    photos.filter((p) => p.slot && p.src).map((p) => [p.slot, p])
  );
  const unused = photos.filter((p) => !p.slot && p.src);
  let unusedI = 0;
  const shots = subjects.map((subject) => {
    let photo = bySlot[subject.slot];
    if (!photo && unused[unusedI]) {
      photo = unused[unusedI];
      unusedI += 1;
    }
    return {
      ...subject,
      src: photo?.src || "",
      filled: Boolean(photo?.src),
      generated: photo?.generated === true,
    };
  });

  const filled = shots.filter((s) => s.filled);
  const required = shots.filter((s) => s.required);
  const requiredFilled = required.filter((s) => s.filled);
  const keys = filled.map((s) => srcKey(s.src)).filter(Boolean);
  const uniqueSrcs = new Set(keys);
  const reusedSrc = keys.length > uniqueSrcs.size;
  const mallStackCount = Number(args.mallStackCount || 0);

  return {
    version: DETAIL_PAGE_IMAGE_CONCEPT_VERSION,
    bank: resolveDetailPageShotBank(input),
    layers: DETAIL_PAGE_IMAGE_LAYERS,
    shots,
    requiredCount: required.length,
    filledCount: filled.length,
    requiredFilledCount: requiredFilled.length,
    uniqueSrcs: uniqueSrcs.size,
    reusedSrc,
    missing: required.filter((s) => !s.filled).map((s) => s.id),
    mallStackCount,
    ok: requiredFilled.length === required.length && !reusedSrc,
    doctrine: reusedSrc
      ? "같은 포대를 칸에 나눠 넣은 것이지, 컷이 생긴 것이 아니다"
      : requiredFilled.length === required.length
        ? "상품 컷이 피사체별로 있다. 붙일 화면은 그 다음이다"
        : "상품 컷이 없다. 장은 세지 말고 빈 피사체를 채운다",
  };
}
