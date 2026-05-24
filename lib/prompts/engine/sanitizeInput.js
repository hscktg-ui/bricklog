/** @deprecated 내부 호환 — utils/sanitizeInput 사용 */
export {
  sanitizeText as sanitizeField,
  isJunkValue as isLowQualityInput,
} from "@/utils/sanitizeInput";

import { sanitizeText, parsePhraseList } from "@/utils/sanitizeInput";

export function normalizeContextFields(ctx) {
  const region = sanitizeText(ctx.region) || ctx.region;
  const main = sanitizeText(ctx.main) || ctx.main;
  let brand = sanitizeText(ctx.brandName);

  const subList = (ctx.subList || parsePhraseList(ctx.subLine))
    .filter((s) => s && s !== main && s !== region);

  if (brand && (brand === main || brand === region)) brand = null;

  return {
    ...ctx,
    region: region || "서울",
    main: main || "로컬 매장",
    brandName: brand,
    subList,
    subLine: subList.length > 0 ? subList.join(", ") : "",
  };
}
