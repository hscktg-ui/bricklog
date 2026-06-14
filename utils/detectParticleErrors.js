import {
  detectKoreanOrthographyIssues,
  fixTokenJosa,
} from "@/lib/korean/koreanOrthographyEngine";

export function detectParticleErrors(text, brandName) {
  const ctx = brandName ? { brandName } : {};
  const audit = detectKoreanOrthographyIssues(text, ctx);
  return {
    hasError: !audit.pass,
    hits: audit.hits,
    score: audit.score,
    particleHits: audit.particleHits,
    spellingHits: audit.spellingHits,
  };
}

export { fixTokenJosa as fixBrandJosaPreview } from "@/lib/korean/koreanOrthographyEngine";
