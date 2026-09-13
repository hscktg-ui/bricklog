/**
 * 리스트 툴 구동을 브릭로그에 적용.
 * 제디터 스펙 칸 + 젠시 컷 슬롯 + 카테고리 기획 JSON → 섹션 템플릿 채움.
 * 크리에이지 가구 20섹션·가짜 후기·GIF·모델컷은 가져오지 않는다.
 */
import {
  buildDetailPageCategoryListing,
  categoryKeyFromDetailInput,
} from "@/lib/product/detailPageCategoryFlow";

const ROLE_IDS = new Set([
  "packshot",
  "front",
  "detail",
  "usage",
  "component",
  "size",
  "package",
]);

export const DETAIL_PAGE_VENDOR_METHOD_VERSION = "vendor-method-v1";

/** 제디터식 입력 칸. 자유 텍스트 features와 별도. */
export const DETAIL_PAGE_SPEC_SLOTS = Object.freeze([
  { key: "origin", label: "산지·원산지" },
  { key: "variety", label: "품종" },
  { key: "weight", label: "중량" },
  { key: "process", label: "도정·로스팅" },
  { key: "pack", label: "포장" },
  { key: "options", label: "옵션" },
]);

const ROLE_TO_SLOT = Object.freeze({
  packshot: "hero",
  front: "hero",
  package: "feature",
  detail: "observe",
  component: "observe",
  size: "feature",
  usage: "scene",
});

const PRIORITY_KEYS = Object.freeze({
  grocery: ["harvest", "variety", "weight", "mill"],
  cafe: ["roast", "weight", "grind", "bean"],
  beauty: ["form", "volume", "ingredient"],
  appliance: ["job", "size", "power"],
  furniture: ["material", "size", "assemble"],
  default: ["weight", "origin"],
});

const SKIP_GLANCE = new Set(["cook", "ingredient", "keep", "brew", "use"]);

function blobOf(item = {}) {
  return [
    item.src,
    item.url,
    item.caption,
    item.name,
    item.file,
    item.hint,
    item.role,
    item.slot,
  ]
    .filter(Boolean)
    .join(" ");
}

export function classifyVendorPhotoRole(item, index = 0) {
  const given = String(item?.role || item?.assetRole || "").trim();
  if (ROLE_IDS.has(given)) return given;
  const blob = blobOf(item);
  if (/macro|grain|bean|원물|쌀알|원두|detail/i.test(blob)) return "detail";
  if (/label|observe|라벨/i.test(blob)) return "detail";
  if (/meal|cook|pour|usage|scene|사용|추출|밥|table/i.test(blob)) return "usage";
  if (/packshot|front|hero|앞면|포대|지대/i.test(blob)) return "packshot";
  if (/package|bag|포장/i.test(blob)) return "package";
  if (item?.slot === "hero") return "packshot";
  if (item?.slot === "observe" || item?.slot === "feature") return "detail";
  if (item?.slot === "scene") return "usage";
  return ["packshot", "detail", "usage", "package"][Math.min(index, 3)];
}

export function assignVendorPhotoSlots(photos = []) {
  return (photos || []).map((photo, i) => {
    const role = classifyVendorPhotoRole(photo, i);
    return {
      ...photo,
      role,
      slot: photo.slot || ROLE_TO_SLOT[role] || "",
    };
  });
}

function shortGlanceToken(slot) {
  const v = String(slot.value || "").replace(/\s+/g, " ").trim();
  if (!v) return "";
  if (slot.key === "harvest") return /햅쌀/.test(v) ? "햅쌀" : v.slice(0, 6);
  if (slot.key === "variety") return v.replace(/\s*(미|쌀)$/, "").slice(0, 6);
  if (slot.key === "weight") {
    const m = v.match(/(\d+(?:\.\d+)?\s*(?:kg|g))/i);
    return m ? m[1].replace(/\s+/g, "") : v.slice(0, 8);
  }
  if (slot.key === "mill") return /당일/.test(v) ? "당일 도정" : "도정";
  if (slot.key === "roast") {
    const m = v.match(/중배전|약배전|강배전|중강배전/);
    return m ? m[0] : /로스트|로스팅/.test(v) ? "로스팅" : v.slice(0, 6);
  }
  if (slot.key === "grind") return /분쇄/.test(v) ? "분쇄" : v.slice(0, 6);
  if (slot.key === "bean") return /블렌드/.test(v) ? "블렌드" : v.slice(0, 6);
  if (slot.key === "origin") return v.slice(0, 6);
  if (slot.key === "form") return v.slice(0, 6);
  if (slot.key === "volume") {
    const m = v.match(/(\d+\s*ml)/i);
    return m ? m[1].replace(/\s+/g, "") : v.slice(0, 6);
  }
  return v.length <= 8 ? v : v.split(/[·.\s]/)[0].slice(0, 8);
}

export function isLyricDetailHeadline(title) {
  return /온기|내려야|향이 번|밥맛은 다릅니다|향은\s|한 공기/.test(String(title || ""));
}

export function isAttributeDetailHeadline(title) {
  return /10kg|200g|\d+\s*(?:kg|g)|햅쌀|도정|진상|로스팅|분쇄|당일|중배전|품종|중량/.test(
    String(title || "")
  );
}

export function resolveHookHeadline(pack = {}, fallback = "") {
  const current = (pack.sections || []).find((s) => s.type === "hero")?.title || "";
  if (current && isAttributeDetailHeadline(current) && !isLyricDetailHeadline(current)) {
    return String(current).replace(/\n/g, " ");
  }
  return firstGlanceHeadline(pack) || fallback || String(current).replace(/\n/g, " ");
}

export function firstGlanceHeadline(input = {}) {
  const listing = buildDetailPageCategoryListing(input);
  const key = listing.key || categoryKeyFromDetailInput(input);
  const order = PRIORITY_KEYS[key] || PRIORITY_KEYS.default;
  const byKey = Object.fromEntries((listing.filled || []).map((s) => [s.key, s]));
  const tokens = [];
  for (const slotKey of order) {
    const slot = byKey[slotKey];
    if (!slot || SKIP_GLANCE.has(slot.key)) continue;
    const token = shortGlanceToken(slot);
    if (token && !tokens.includes(token)) tokens.push(token);
    if (tokens.length >= 4) break;
  }
  if (tokens.length < 2) {
    for (const slot of listing.filled || []) {
      if (SKIP_GLANCE.has(slot.key)) continue;
      const token = shortGlanceToken(slot);
      if (token && !tokens.includes(token)) tokens.push(token);
      if (tokens.length >= 3) break;
    }
  }
  if (!tokens.length) {
    const weight = String(input.weight || "").match(/(\d+(?:\.\d+)?\s*(?:kg|g))/i);
    if (weight) tokens.push(weight[1].replace(/\s+/g, ""));
    if (/햅쌀/.test(`${input.productName || ""}`)) tokens.unshift("햅쌀");
  }
  return tokens.slice(0, 4).join(" · ");
}

export function applyVendorMethodToPack(pack = {}, input = {}) {
  const source = { ...input, ...pack };
  const glance = resolveHookHeadline(source);
  const photos = assignVendorPhotoSlots(input.photos || pack.photos || []);
  const listing = buildDetailPageCategoryListing(source);
  const sections = (pack.sections || []).map((s) => {
    if (s.type !== "hero" || !glance) return s;
    return {
      ...s,
      kicker: s.kicker || listing.label || source.brandName || "",
      title: glance,
      heading: glance,
    };
  });
  return {
    ...pack,
    photos,
    sections,
    _meta: {
      ...(pack._meta || {}),
      vendorMethod: {
        version: DETAIL_PAGE_VENDOR_METHOD_VERSION,
        glance,
        category: listing.key,
        photoSlots: photos.map((p) => ({ role: p.role, slot: p.slot })),
      },
    },
  };
}
