import { fixBrandJosa } from "@/lib/korean/josaFix";

const BAD_PARTICLES = [
  /브랜드은/g,
  /매장는/g,
  /플라워은/g,
  /꽃집은(?=[^가-힣]|$)/,
];

export function detectParticleErrors(text, brandName) {
  const hits = [];
  for (const re of BAD_PARTICLES) {
    if (re.test(text)) hits.push(re.source);
  }
  if (brandName) {
    const fixed = fixBrandJosa(text, brandName);
    if (fixed !== text) hits.push("brand_josa");
  }
  return {
    hasError: hits.length > 0,
    hits,
    score: hits.length ? 55 : 94,
  };
}
