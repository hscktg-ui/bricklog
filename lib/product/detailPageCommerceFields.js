/**
 * 셀러가 넣은 가격·배송·옵션. normalize가 버리면 표에 [자료 필요]만 남는다.
 */
export const DETAIL_PAGE_COMMERCE_FIELD_KEYS = Object.freeze([
  "price",
  "salePrice",
  "options",
  "sellingOptions",
  "weight",
  "origin",
  "variety",
  "ingredient",
  "producer",
  "maker",
  "manufacturer",
  "process",
  "pack",
  "storage",
  "milledAt",
  "madeOn",
  "manufacturedAt",
  "shipping",
  "delivery",
  "dispatch",
  "exchange",
  "refund",
  "shelfLife",
  "expiry",
  "caution",
  "warning",
  "islandShipping",
  "certification",
  "cert",
  "review",
]);

function cleanLine(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

export function pickCommerceLine(input, keys) {
  for (const key of keys) {
    const v = cleanLine(input?.[key]);
    if (v) return v;
  }
  return "";
}

export function pickDetailPageCommerceFields(input = {}) {
  return {
    price: pickCommerceLine(input, ["price", "salePrice"]),
    options: pickCommerceLine(input, ["options", "sellingOptions"]),
    weight: pickCommerceLine(input, ["weight"]),
    origin: pickCommerceLine(input, ["origin"]),
    variety: pickCommerceLine(input, ["variety"]),
    ingredient: pickCommerceLine(input, ["ingredient"]),
    producer: pickCommerceLine(input, ["producer", "maker", "manufacturer"]),
    process: pickCommerceLine(input, ["process"]),
    pack: pickCommerceLine(input, ["pack"]),
    storage: pickCommerceLine(input, ["storage"]),
    madeOn: pickCommerceLine(input, ["milledAt", "madeOn", "manufacturedAt"]),
    shipping: pickCommerceLine(input, ["shipping", "delivery"]),
    dispatch: pickCommerceLine(input, ["dispatch", "shipWhen"]),
    exchange: pickCommerceLine(input, ["exchange", "refund"]),
    shelfLife: pickCommerceLine(input, ["shelfLife", "expiry"]),
    caution: pickCommerceLine(input, ["caution", "warning"]),
    islandShipping: pickCommerceLine(input, ["islandShipping"]),
    cert: pickCommerceLine(input, ["certification", "cert"]),
    review: pickCommerceLine(input, ["review", "reviews"]),
  };
}
