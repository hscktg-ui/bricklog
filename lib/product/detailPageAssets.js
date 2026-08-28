/**
 * 상세 사진 역할. image[]가 아니라 용도가 있는 자산.
 * 가짜 모델컷 역할은 두지 않는다.
 */
export const DETAIL_PAGE_ASSET_ROLES = Object.freeze([
  { id: "packshot", label: "제품 전체" },
  { id: "front", label: "앞면" },
  { id: "detail", label: "디테일" },
  { id: "usage", label: "사용" },
  { id: "component", label: "구성" },
  { id: "size", label: "치수·정보" },
  { id: "package", label: "포장" },
]);

const ROLE_IDS = new Set(DETAIL_PAGE_ASSET_ROLES.map((r) => r.id));

export const DETAIL_PAGE_PRODUCT_IDENTITY = Object.freeze({
  preserveShape: true,
  preserveLogo: true,
  preserveLabel: true,
  preserveColor: true,
  preserveMaterial: true,
  allowPerspectiveChange: false,
  allowModel: false,
});

const DEFAULT_BY_INDEX = ["packshot", "detail", "usage", "detail"];

export function isDetailPageAssetRole(value) {
  return ROLE_IDS.has(String(value || ""));
}

export function classifyDetailPageAssetRole(item, index = 0) {
  const given = String(item?.role || item?.assetRole || "").trim();
  if (isDetailPageAssetRole(given)) return given;
  const slot = String(item?.slot || "");
  if (slot === "hero") return "packshot";
  if (slot === "observe" || slot === "feature") return "detail";
  if (slot === "scene") return "usage";
  return DEFAULT_BY_INDEX[Math.min(index, DEFAULT_BY_INDEX.length - 1)];
}

export function assignDetailPageAssetRoles(photos = []) {
  return (photos || []).map((photo, i) => ({
    ...photo,
    role: classifyDetailPageAssetRole(photo, i),
  }));
}

export function pickDetailPageAsset(photos = [], roles = []) {
  const want = new Set(roles);
  return (photos || []).find((p) => want.has(p.role) && p.src) || null;
}
