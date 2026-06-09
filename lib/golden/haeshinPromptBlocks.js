/**
 * 해신기획 DNA — 생성 전 프롬프트 블록
 */
import {
  BLOG_STRUCTURE_ARC,
  DEFAULT_STYLE_PROFILE,
  FORBIDDEN_GLOBAL_PHRASES,
  AI_CLICHE_PHRASES,
  HAESHIN_CONTENT_PHILOSOPHY,
  INDUSTRY_CONTENT_DNA,
  KIM_TAEGYU_VOICE_DNA,
} from "@/lib/golden/haeshinContentDnaSeed";
import { resolveGoldenIndustryKey, goldenIndustryLabel } from "@/lib/golden/goldenIndustryKeys";
import { extractBrandDnaFields } from "@/lib/golden/goldenBrandDnaEngine";

export function buildHaeshinDnaPromptBlock(input = {}) {
  const key = resolveGoldenIndustryKey(input);
  const dna = INDUSTRY_CONTENT_DNA[key] || INDUSTRY_CONTENT_DNA.etc;
  const brand = extractBrandDnaFields(input);
  const style = DEFAULT_STYLE_PROFILE;

  return [
    "【HAESHIN 콘텐츠 DNA — 생성 전 필수】",
    `철학: ${HAESHIN_CONTENT_PHILOSOPHY.slice(0, 4).join(" · ")}`,
    `문체: ${style.tone} · 감정 ${style.emotion_level} · 광고압 ${style.sales_pressure} · CTA ${style.cta_strength}`,
    `구조: ${BLOG_STRUCTURE_ARC.join(" → ")}`,
    `업종(${goldenIndustryLabel(key)}): ${dna.direction}`,
    `검색의도: ${(dna.searchIntents || []).slice(0, 6).join(", ")}`,
    `포함요소: ${(dna.mustInclude || []).slice(0, 6).join(", ")}`,
    `금지(업종): ${(dna.forbiddenWords || []).map((r) => r.source).slice(0, 5).join(" · ") || "없음"}`,
    `브랜드: ${brand.brand || "(입력)"} · 지역: ${brand.region || "(입력)"} · 운영: ${brand.ops.join(", ") || "확인된 범위만"}`,
    `대표님 문체: ${KIM_TAEGYU_VOICE_DNA.slice(0, 4).join(" · ")}`,
    `전역 금칙: ${FORBIDDEN_GLOBAL_PHRASES.slice(0, 8).join(", ")}`,
    `AI관용구 금지: ${AI_CLICHE_PHRASES.slice(0, 6).join(", ")}`,
    "불확실한 지역·제품·행사·가격 임의 생성 금지",
  ].join("\n");
}

export function buildHaeshinPreGenerationChecklist(input = {}) {
  const brand = extractBrandDnaFields(input);
  return [
    "【생성 전 체크】",
    `업종: ${resolveGoldenIndustryKey(input)}`,
    `주제: ${input.topic || input.mainKeyword || ""}`,
    `브랜드: ${brand.brand}`,
    `지역: ${brand.region}`,
    `화자: ${input.v4Speaker || "brand_intro"}`,
    "미확인 정보는 쓰지 않는다",
  ].join("\n");
}
