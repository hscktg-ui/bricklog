import { isLowQualityInput } from "@/lib/prompts/engine/sanitizeInput";

const HANGUL_JAMO_ONLY_RE = /^[\u3131-\u318E\u1100-\u11FF\uA960-\uA97F\uD7B0-\uD7FF]+$/;

function hasMeaningfulText(value) {
  const v = String(value || "").trim();
  if (!v) return false;
  if (HANGUL_JAMO_ONLY_RE.test(v)) return false;
  return true;
}

export function validateForm(values) {
  const errors = {};

  if (!values.region?.trim() || values.region.trim().length < 2) {
    errors.region = "지역을 입력해 주세요";
  }

  const topic = values.topic?.trim();
  const brand = values.brandName?.trim();
  const main = values.mainKeyword?.trim();
  const hasStory = Boolean(topic || main);

  if (!brand) {
    errors.brandName = "브랜드명을 입력해 주세요";
  }
  if (!hasStory) {
    errors.topic = "오늘의 주제를 입력하거나 영감에서 골라 주세요";
  }

  if (main && isLowQualityInput(main)) {
    errors.mainKeyword = "의미 있는 표현을 입력해 주세요";
  }

  return errors;
}

export function isFormValid(values) {
  return Object.keys(validateForm(values)).length === 0;
}

/** 브랜드·지역·주제(또는 메인키워드)만 있으면 빠른 생성 가능 */
export function canQuickGenerate(values) {
  return (
    values.region?.trim().length >= 2 &&
    values.brandName?.trim().length >= 1 &&
    Boolean(values.topic?.trim() || values.mainKeyword?.trim())
  );
}

/** 플레이스·인스타·이미지 단독 생성 — 블로그보다 완화 (첫 로그인·채널 직행) */
export function canChannelGenerate(values) {
  const brand = values?.brandName?.trim();
  if (!brand) return false;
  const hasStory =
    hasMeaningfulText(values?.topic) ||
    hasMeaningfulText(values?.mainKeyword) ||
    hasMeaningfulText(values?.subKeyword) ||
    hasMeaningfulText(values?.brandDescription) ||
    hasMeaningfulText(values?.storeFeatures) ||
    hasMeaningfulText(values?.placeHeadline) ||
    hasMeaningfulText(values?.placeDetailHint) ||
    hasMeaningfulText(values?.placeKeyFacts) ||
    hasMeaningfulText(values?.placePeriod) ||
    hasMeaningfulText(values?.instaScene);
  return Boolean(hasStory);
}

/**
 * 채널 생성 전 폼 보정 — 브랜드만 있어도 기본 주제·지역 채움
 * @param {object} values
 * @param {{ brandName?: string, region?: string, industry?: string, brandDescription?: string } | null} brand
 */
export function ensureChannelGenerateInput(values, brand = null) {
  const next = { ...values };
  if (!next.brandName?.trim() && brand?.brandName?.trim()) {
    next.brandName = brand.brandName.trim();
  }
  if (!next.region?.trim() || next.region.trim().length < 2) {
    const r = brand?.region?.trim();
    next.region = r && r.length >= 2 ? r : "전국";
  }
  const hasStory =
    next.topic?.trim() ||
    next.mainKeyword?.trim() ||
    next.brandDescription?.trim() ||
    next.storeFeatures?.trim() ||
    next.placeHeadline?.trim() ||
    next.placeKeyFacts?.trim() ||
    next.placePeriod?.trim() ||
    next.instaScene?.trim();
  if (!hasStory) {
    const seed = next.brandName?.trim() || brand?.brandName?.trim() || "브랜드";
    next.topic = `${seed} 소식`;
    if (!next.mainKeyword?.trim()) {
      next.mainKeyword =
        brand?.mainKeyword?.trim() || seed.replace(/\s+/g, "").slice(0, 24);
    }
  }
  if (!next.placeHeadline?.trim() && next.topic?.trim()) {
    next.placeHeadline = next.topic.trim().slice(0, 40);
  }
  const changed =
    next.brandName !== values.brandName ||
    next.region !== values.region ||
    next.topic !== values.topic ||
    next.mainKeyword !== values.mainKeyword ||
    next.placeHeadline !== values.placeHeadline;
  return { values: next, ok: canChannelGenerate(next), changed };
}
