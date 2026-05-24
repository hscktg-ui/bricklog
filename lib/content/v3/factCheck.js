import { getBlogFullText } from "@/utils/qualityCheck";

/**
 * V3 9단계 — 팩트체크 (작성 후)
 */
export function runPostWriteFactCheckV3(pack, input = {}) {
  const full = getBlogFullText(pack);
  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  const product = String(
    input.v2ProductName || input.topic || ""
  ).trim();
  const productToken = product.match(/([A-Za-z0-9가-힣]{2,20})/)?.[1] || product;

  const checks = {
    brandPresent: !brand || full.includes(brand),
    regionPresent: !region || full.includes(region),
    productPresent: !productToken || full.includes(productToken),
    titleAligned:
      !brand ||
      String(pack.representativeTitle || pack.title || "").includes(brand) ||
      full.slice(0, 200).includes(brand),
  };

  const unverifiedPatterns = [
    /확실히\s*\d+%/,
    /무조건\s*최고/,
    /업계\s*1위/,
    /반드시\s*효과/,
    /의사가\s*추천(?!.*확인)/,
  ];
  const fictionHits = unverifiedPatterns
    .filter((re) => re.test(full))
    .map((re) => re.source);

  const pass =
    Object.values(checks).every(Boolean) && fictionHits.length === 0;

  return {
    pass,
    ok: pass,
    checks,
    fictionHits,
    note: pass
      ? "브랜드·지역·제품명 일치 확인"
      : "팩트·명칭 불일치 또는 허구 표현 감지",
  };
}
