/** 브랜드·초안 로드 시 모든 지연 폼(draft)을 committed 값으로 맞춤 */

import { isPlaceholderBrandName } from "@/lib/content/channelBrandResolve";
import { shouldMergeWorkspaceBrand } from "@/lib/workspace/brandScopeGuard";
import {
  materializeVerifiedGenerationAxes,
  stampVerifiedGenerationAxes,
} from "@/lib/product/deliverySoftPass";

export const BRAND_FORM_SYNC_EVENT = "briclog-brand-form-sync";

export function emitBrandFormSync(form) {
  if (typeof window === "undefined" || !form) return;
  window.dispatchEvent(
    new CustomEvent(BRAND_FORM_SYNC_EVENT, { detail: { form } })
  );
}

const GENERATION_AXIS_KEYS = ["brandName", "region", "topic", "mainKeyword"];

export function formAxisSignature(input = {}) {
  return GENERATION_AXIS_KEYS.map((k) => String(input[k] ?? "").trim()).join(
    "\u0001"
  );
}

/** 화면 폼·자동 저장(committed) — 어느 쪽이든 채워진 축을 합침 */
export function mergeLiveFormWithCommitted(live = {}, committed = {}) {
  const pick = (key) => {
    const fromLive = String(live[key] ?? "").trim();
    const fromCommitted = String(committed[key] ?? "").trim();
    return fromLive || fromCommitted;
  };
  const topic = pick("topic") || pick("mainKeyword");
  const mainKeyword =
    pick("mainKeyword") || topic.split(/[,，]/)[0]?.trim() || topic;
  return {
    ...committed,
    ...live,
    brandName: pick("brandName"),
    region: pick("region"),
    topic,
    mainKeyword,
  };
}

function workspaceBrandHooks(brandHooks = null) {
  if (!brandHooks) return null;
  return {
    activeBrand: brandHooks.activeBrand,
    activeBrandId: brandHooks.activeBrandId,
    blankBrandMode: brandHooks.blankBrandMode,
  };
}

function canMergeWorkspaceBrand(input = {}, brandHooks = null) {
  const hooks = workspaceBrandHooks(brandHooks);
  if (!hooks || hooks.blankBrandMode) return false;
  const brand = hooks.activeBrand;
  const brandId = hooks.activeBrandId;
  if (!brand?.brandName?.trim() || !brandId) return false;
  return shouldMergeWorkspaceBrand(input, brand, brandId);
}

/**
 * 폼·사이드바 브랜드를 한 축으로 — 검증·생성 SSOT
 * (폼 STEP1 비어 있어도 사이드바 선택 브랜드 인정)
 */
export function resolveBlogFormAxes(input = {}, brandHooks = null) {
  const next = { ...input };
  const stamped = input._verifiedGenerationAxes;
  if (stamped && typeof stamped === "object") {
    if (!String(next.brandName || "").trim() && stamped.brandName) {
      next.brandName = String(stamped.brandName).trim();
    }
    if (!String(next.region || "").trim() && stamped.region) {
      next.region = String(stamped.region).trim();
    }
    const topicEmpty =
      !String(next.topic || "").trim() &&
      !String(next.mainKeyword || "").trim();
    if (topicEmpty && stamped.topic) {
      next.topic = String(stamped.topic).trim();
      next.mainKeyword =
        String(next.mainKeyword || "").trim() ||
        next.topic.split(/[,，]/)[0]?.trim() ||
        next.topic;
    }
  }
  const hooks = workspaceBrandHooks(brandHooks);
  const brand = hooks?.activeBrand;
  const brandId = hooks?.activeBrandId;
  const mergeOk = canMergeWorkspaceBrand(input, hooks);

  let brandName = String(next.brandName || "").trim();
  if ((!brandName || isPlaceholderBrandName(brandName)) && mergeOk) {
    const fromWorkspace = String(brand?.brandName || "").trim();
    if (fromWorkspace && !isPlaceholderBrandName(fromWorkspace)) {
      brandName = fromWorkspace;
    }
  }
  next.brandName = brandName;

  let region = String(next.region || "").trim();
  if ((!region || region.length < 2) && mergeOk) {
    const fromWorkspace = String(brand?.region || "").trim();
    if (fromWorkspace.length >= 2) region = fromWorkspace;
  }
  next.region = region;

  let topic = String(next.topic || "").trim();
  let mainKeyword = String(next.mainKeyword || "").trim();
  if (!topic && !mainKeyword && mergeOk) {
    const seed =
      String(brand?.topic || brand?.lastTopic || brand?.mainKeyword || "").trim();
    if (seed) {
      topic = seed;
      mainKeyword = mainKeyword || seed.split(/[,，]/)[0]?.trim() || seed;
    }
  }
  if (topic && !mainKeyword) {
    mainKeyword = topic.split(/[,，]/)[0]?.trim() || topic;
  }
  next.topic = topic || next.topic;
  next.mainKeyword = mainKeyword || next.mainKeyword;

  if (mergeOk && brandId && !next.brandId) next.brandId = brandId;

  return next;
}

/** 빈 문자열이 committed 값을 덮어쓰지 않게 병합 (지연 폼 flush 전 생성 클릭) */
export function coalesceBlogGenerationInput(base = {}, override = {}) {
  const next = { ...base, ...override };
  for (const key of GENERATION_AXIS_KEYS) {
    const over = String(override[key] ?? "").trim();
    const kept = String(base[key] ?? "").trim();
    if (!over && kept) next[key] = base[key];
  }
  return next;
}

/** 외부 동기화(브랜드 전환·초안 로드) — 화면에 입력 중인 축은 유지 */
export function mergeBrandFormSyncPayload(incoming = {}, live = {}) {
  return coalesceBlogGenerationInput(incoming, live);
}

function brandHooksFromPipelineInput(input = {}) {
  const brand = input.brandMemory;
  const brandId = input.brandId;
  if (!brand?.brandName?.trim() && !brandId) return null;
  return { activeBrand: brand, activeBrandId: brandId };
}

/** 사이드바 선택 브랜드 → 폼·파이프라인 축 보강 */
export function mergeWorkspaceBrandIntoInput(input = {}, brandHooks = null) {
  const hooks =
    brandHooks ||
    brandHooksFromPipelineInput(input) ||
    null;
  const brand = hooks?.activeBrand;
  const brandId = hooks?.activeBrandId;
  if (!brand?.brandName?.trim() && !brandId) return input;
  if (
    hooks?.blankBrandMode ||
    !shouldMergeWorkspaceBrand(input, brand, brandId)
  ) {
    return { ...input, brandId: undefined, brandMemory: undefined };
  }

  let next = { ...input };
  const formBrand = String(next.brandName || "").trim();
  const workspaceBrand = String(brand?.brandName || "").trim();
  if (
    (!formBrand || isPlaceholderBrandName(formBrand)) &&
    workspaceBrand &&
    !isPlaceholderBrandName(workspaceBrand)
  ) {
    next.brandName = workspaceBrand;
  } else if (!formBrand && workspaceBrand) {
    next.brandName = workspaceBrand;
  }
  if (
    (!next.region?.trim() || next.region.trim().length < 2) &&
    brand?.region?.trim()?.length >= 2
  ) {
    next.region = brand.region.trim();
  }
  if (!next.brandId && brandId) next.brandId = brandId;
  if (!next.industry?.trim() && brand?.industry?.trim()) {
    next.industry = brand.industry.trim();
  }
  if (!next.topic?.trim() && brand?.topic?.trim()) {
    next.topic = brand.topic.trim();
  }
  if (!next.mainKeyword?.trim() && brand?.mainKeyword?.trim()) {
    next.mainKeyword = brand.mainKeyword.trim();
  }
  if (!next.storeFeatures?.trim() && (brand?.storeFeatures || brand?.brandDescription)?.trim()) {
    next.storeFeatures = (brand.storeFeatures || brand.brandDescription).trim();
  }
  if (!next.brandDescription?.trim() && brand?.brandDescription?.trim()) {
    next.brandDescription = brand.brandDescription.trim();
  }
  if (!next.includePhrases?.trim() && brand?.includePhrases?.trim()) {
    next.includePhrases = brand.includePhrases.trim();
  }
  if (!next.brandMemory && brand?.brandName?.trim()) {
    next.brandMemory = brand;
  }
  if (!next.topic?.trim() && !next.mainKeyword?.trim() && next.brandName?.trim()) {
    const seed = next.brandName.trim();
    next.topic = `${seed} 소식`;
    next.mainKeyword = seed.replace(/\s+/g, "").slice(0, 24) || seed;
  }
  return next;
}

/** 생성·API 직전 — 폼·스탬프·사이드바를 top-level brand/region/topic으로 확정 */
export function ensureGenerationAxesOnInput(input = {}, brandHooks = null) {
  const resolved = brandHooks
    ? resolveBlogFormAxes(input, brandHooks)
    : resolveBlogFormAxes(input);
  return materializeVerifiedGenerationAxes(stampVerifiedGenerationAxes(resolved));
}
