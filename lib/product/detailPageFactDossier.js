/**
 * 상세 생성 전 자료 검사. 없는 가격·인증·후기·효능은 만들지 않는다.
 * 부족하면 문장으로 숨기지 않고 [자료 필요: 항목]으로 표시한다.
 */
import { buildDetailPageCategoryListing } from "@/lib/product/detailPageCategoryFlow";

export const DETAIL_PAGE_NEED_MARK = "[자료 필요";
export const DETAIL_PAGE_COMMERCE_VERSION = "detail-commerce-v1";

const REQUIRED = Object.freeze([
  { id: "brandName", label: "브랜드명" },
  { id: "productName", label: "상품명" },
  { id: "category", label: "상품 카테고리" },
  { id: "target", label: "핵심 고객" },
  { id: "price", label: "가격" },
  { id: "weight", label: "중량과 규격" },
  { id: "origin", label: "원산지" },
]);

const RECOMMENDED = Object.freeze([
  { id: "options", label: "판매 옵션" },
  { id: "ingredient", label: "원재료" },
  { id: "variety", label: "품종" },
  { id: "producer", label: "생산자 또는 제조자" },
  { id: "process", label: "생산·가공 방식" },
  { id: "madeOn", label: "도정일 또는 제조일" },
  { id: "pack", label: "포장 방식" },
  { id: "storage", label: "보관 방법" },
  { id: "shipping", label: "배송 일정과 배송비" },
  { id: "exchange", label: "교환·환불 기준" },
  { id: "shelf", label: "소비기한 또는 품질 유지 기준" },
  { id: "cert", label: "인증·검사 자료" },
  { id: "review", label: "고객 후기" },
  { id: "photos", label: "제공된 사진 목록" },
]);

function clean(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

export function needFact(label) {
  return `[자료 필요: ${label}]`;
}

export function isNeedFact(value) {
  return String(value || "").includes(DETAIL_PAGE_NEED_MARK);
}

export function clipHeadline(text, max = 24) {
  const t = clean(text);
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const spaced = cut.replace(/\s+\S*$/, "");
  return spaced.length >= 8 ? spaced : cut;
}

export function clipBody(text, max = 80) {
  const t = clean(text);
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const spaced = cut.replace(/\s+\S*$/, "");
  return `${spaced.length >= 12 ? spaced : cut}`;
}

function listingValue(listing, label) {
  const hit = (listing?.filled || []).find((s) => s.label === label);
  return clean(hit?.value || "");
}

function pickInput(input, keys) {
  for (const key of keys) {
    const v = clean(input?.[key]);
    if (v) return v;
  }
  return "";
}

function photoCount(input) {
  const photos = input?.photos || input?.images || input?.shots || [];
  return Array.isArray(photos) ? photos.filter((p) => p && (p.src || p.url || typeof p === "string")).length : 0;
}

export function inspectDetailPageFacts(input = {}) {
  const listing = buildDetailPageCategoryListing(input);
  const values = {
    brandName: pickInput(input, ["brandName"]),
    productName: pickInput(input, ["productName"]),
    category: listing.label || listing.key || "",
    target: pickInput(input, ["target"]),
    price: pickInput(input, ["price", "salePrice"]),
    options: pickInput(input, ["options", "sellingOptions"]),
    weight: listingValue(listing, "중량") || pickInput(input, ["weight"]),
    origin:
      pickInput(input, ["origin"]) ||
      listingValue(listing, "원산지") ||
      listingValue(listing, "산지") ||
      pickInput(input, ["region"]),
    ingredient: listingValue(listing, "원재료") || pickInput(input, ["ingredient"]),
    variety: listingValue(listing, "품종") || pickInput(input, ["variety"]),
    producer: pickInput(input, ["producer", "maker", "manufacturer"]),
    process:
      listingValue(listing, "도정") ||
      listingValue(listing, "로스팅") ||
      pickInput(input, ["process"]),
    madeOn: pickInput(input, ["milledAt", "madeOn", "manufacturedAt"]),
    pack: listingValue(listing, "포장") || pickInput(input, ["pack"]),
    storage: listingValue(listing, "보관") || pickInput(input, ["storage"]),
    shipping: pickInput(input, ["shipping", "delivery"]),
    dispatch: pickInput(input, ["dispatch", "shipWhen"]),
    exchange: pickInput(input, ["exchange", "refund"]),
    shelf: pickInput(input, ["shelfLife", "expiry"]),
    caution: pickInput(input, ["caution", "warning"]),
    islandShipping: pickInput(input, ["islandShipping"]),
    cert: pickInput(input, ["certification", "cert"]),
    review: pickInput(input, ["review", "reviews"]),
    photos: photoCount(input) ? `사진 ${photoCount(input)}장` : "",
    harvest: listingValue(listing, "햅쌀"),
  };

  const missingRequired = REQUIRED.filter((f) => !values[f.id]).map((f) => f.label);
  const missingRecommended = RECOMMENDED.filter((f) => !values[f.id]).map((f) => f.label);

  const sourceFacts = [];
  const pushFact = (id, label, value) => {
    if (!value || isNeedFact(value)) return;
    sourceFacts.push({ id, label, value });
  };
  pushFact("productName", "상품명", values.productName);
  pushFact("brandName", "브랜드명", values.brandName);
  pushFact("category", "상품 카테고리", values.category);
  pushFact("target", "핵심 고객", values.target);
  pushFact("origin", "원산지", values.origin);
  pushFact("weight", "중량", values.weight);
  pushFact("harvest", "햅쌀", values.harvest);
  pushFact("process", "가공", values.process);
  pushFact("pack", "포장", values.pack);
  pushFact("ingredient", "원재료", values.ingredient);
  pushFact("searchIntent", "구매 고민", pickInput(input, ["searchIntent"]));
  pushFact("price", "가격", values.price);
  pushFact("producer", "생산자", values.producer);
  pushFact("variety", "품종", values.variety);
  pushFact("shipping", "배송", values.shipping);
  for (const slot of listing.filled || []) {
    if (!sourceFacts.some((f) => f.label === slot.label && f.value === slot.value)) {
      pushFact(`slot-${slot.key}`, slot.label, slot.value);
    }
  }

  const prohibitedClaims = [
    ...(listing.doNotInvent || []),
    "없는 가격",
    "없는 인증",
    "없는 후기",
    "질병 예방·치료",
    "최고·유일 비교",
  ];

  const fact = (id, label) => values[id] || needFact(label);

  const listingRows = (listing.specRows || []).filter((r) => r[0] && r[1]);
  const commerceRows = [
    ["상품명", fact("productName", "상품명")],
    ["중량", fact("weight", "중량")],
    ["원산지", fact("origin", "원산지")],
    ["원재료", fact("ingredient", "원재료")],
    ["생산자 또는 제조자", fact("producer", "생산자 또는 제조자")],
    ["생산일·도정일·제조일", fact("madeOn", "도정일 또는 제조일")],
    ["포장 방식", fact("pack", "포장 방식")],
    ["보관 방법", fact("storage", "보관 방법")],
    ["소비기한", fact("shelf", "소비기한")],
    ["인증과 검사", values.cert || ""],
    ["가격", fact("price", "가격")],
    ["판매 옵션", fact("options", "판매 옵션")],
    ["주의사항", values.caution || ""],
  ];
  const specRows = [];
  const seen = new Set();
  for (const row of [...listingRows, ...commerceRows]) {
    if (!row[0] || seen.has(row[0])) continue;
    seen.add(row[0]);
    specRows.push(row);
  }

  const strongest =
    sourceFacts.find((f) => f.label === "산지") ||
    sourceFacts.find((f) => f.label === "도정" || f.label === "가공") ||
    sourceFacts.find((f) => f.label === "햅쌀") ||
    sourceFacts[0] ||
    null;

  return {
    version: DETAIL_PAGE_COMMERCE_VERSION,
    listingKey: listing.key,
    values,
    missingRequired,
    missingRecommended,
    sourceFacts,
    prohibitedClaims,
    specRows,
    strongest,
    usableFacts: sourceFacts.map((f) => `${f.label} ${f.value}`),
  };
}

export function buildDetailPageCommerceDocument(pack, dossier, input = {}) {
  const sections = (pack?.sections || []).map((s) => ({
    id: s.type,
    purpose: s.kicker || s.type,
    eyebrow: s.kicker || "",
    headline: s.title || "",
    body: s.body || "",
    facts: s.bullets || [],
    sourceFactIds: (s.sourceFactIds || []).slice(),
    imageBrief: s.imageBrief
      ? typeof s.imageBrief === "object"
        ? s.imageBrief
        : { purpose: s.imageBrief }
      : null,
    imageAssetId: s.type,
    altText: s.altText || "",
    layout: s.type,
    cta: s.ctaLabel || "",
    mobileNotes: "본문 16px 이상, 가로 스크롤 없음",
  }));
  return {
    pageTitle: pack?.productName || input.productName || "",
    targetCustomer: input.target || pack?.subhead || "",
    missingRequired: dossier?.missingRequired || [],
    missingRecommended: dossier?.missingRecommended || [],
    sourceFacts: dossier?.sourceFacts || [],
    sections,
  };
}
