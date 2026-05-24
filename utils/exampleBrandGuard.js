/**
 * 예시·시드 브랜드명이 사용자 결과물에 섞이지 않도록 차단
 * 실제 브랜드명은 사용자 입력값일 때만 허용
 */

import { LEGACY_CLIENT_BRAND_NAMES } from "@/lib/examples/fictionalBrands";

export const EXAMPLE_BRAND_NAMES = LEGACY_CLIENT_BRAND_NAMES;

export const ABSTRACT_INDUSTRY_LABELS = {
  flower: "꽃집 브랜드",
  cafe: "동네 카페",
  hospital: "의원·클리닉",
  furniture: "프리미엄 가구 매장",
  carwash: "세차장",
  default: "로컬 매장",
};

export function scrubExampleBrandsFromText(text, userBrandName = "") {
  let t = String(text || "");
  const allowed = (userBrandName || "").trim().toLowerCase();

  for (const name of EXAMPLE_BRAND_NAMES) {
    if (!name || name.length < 2) continue;
    if (allowed && name.toLowerCase() === allowed) continue;
    if (allowed && allowed.includes(name.toLowerCase())) continue;
    t = t.replace(new RegExp(name, "gi"), "");
  }
  return t.replace(/\s{2,}/g, " ").trim();
}

export function scrubExampleBrandsFromPack(pack, channel, userBrandName) {
  if (!pack) return pack;
  const scrub = (s) => scrubExampleBrandsFromText(s, userBrandName);

  if (channel === "blog") {
    return {
      ...pack,
      representativeTitle: scrub(pack.representativeTitle || pack.title),
      title: scrub(pack.title),
      sections: (pack.sections || []).map((s) => ({
        ...s,
        heading: scrub(s.heading),
        body: scrub(s.body),
      })),
      conclusion: scrub(pack.conclusion),
      hashtags: (pack.hashtags || []).filter(
        (t) =>
          !EXAMPLE_BRAND_NAMES.some((n) =>
            String(t).toLowerCase().includes(n.toLowerCase().replace(/\s/g, ""))
          )
      ),
    };
  }

  if (channel === "place" || channel === "smartplace") {
    return {
      ...pack,
      title: scrub(pack.title),
      shortBody: scrub(pack.shortBody || pack.shortNotice),
      shortNotice: scrub(pack.shortNotice || pack.shortBody),
      detailBody: scrub(pack.detailBody),
      cta: scrub(pack.cta),
    };
  }

  if (channel === "instagram" || channel === "insta") {
    return {
      ...pack,
      hook: scrub(pack.hook),
      body: scrub(pack.body),
      ending: scrub(pack.ending),
      lineBreakBody: scrub(pack.lineBreakBody),
    };
  }

  return pack;
}
