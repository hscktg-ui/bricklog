/**
 * Brand scope guard — 폼 입력과 활성 브랜드 불일치 시 메모리·학습 오염 차단
 */
import { resolveBriclogIndustryKey } from "@/lib/product/industryContextEngine";

export const BRAND_BLANK_SESSION_EVENT = "briclog-brand-blank-session";
export const BRAND_WORKSPACE_SELECTED_EVENT = "briclog-brand-workspace-selected";

export function normalizeBrandName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, "")
    .toLowerCase();
}

export function brandNamesMatch(a, b) {
  const left = normalizeBrandName(a);
  const right = normalizeBrandName(b);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.length >= 4 && right.length >= 4) {
    return left.includes(right) || right.includes(left);
  }
  return false;
}

/** 사이드바 활성 브랜드를 폼·생성 입력에 병합해도 되는지 */
export function shouldMergeWorkspaceBrand(formInput = {}, activeBrand = null, activeBrandId = null) {
  if (!activeBrandId || !activeBrand?.brandName?.trim()) return false;
  const formName = String(formInput.brandName || "").trim();
  if (!formName) return true;
  return brandNamesMatch(formName, activeBrand.brandName);
}

/** buildProvisionalBrandFromForm fallback — 이름 불일치·빈 세션이면 null */
export function resolveFallbackBrandForForm(
  formInput = {},
  activeBrand = null,
  { blankBrandMode = false } = {}
) {
  if (blankBrandMode) return null;
  if (!activeBrand?.brandName?.trim()) return null;
  const formName = String(formInput.brandName || "").trim();
  if (!formName) return activeBrand;
  return brandNamesMatch(formName, activeBrand.brandName) ? activeBrand : null;
}

/** 생성 시 brandId — 폼 브랜드명과 활성 브랜드가 다르면 활성 id 사용 금지 */
export function resolveBrandIdForGeneration(
  formInput = {},
  { syncBrand = null, activeBrand = null, activeBrandId = null, blankBrandMode = false } = {}
) {
  if (syncBrand?.id) return syncBrand.id;
  if (blankBrandMode) return formInput.brandId || syncBrand?.id || null;
  if (
    activeBrandId &&
    activeBrand?.brandName?.trim() &&
    shouldMergeWorkspaceBrand(formInput, activeBrand, activeBrandId)
  ) {
    return activeBrandId;
  }
  return formInput.brandId || syncBrand?.id || null;
}

export function brandSessionStorageKey(userId) {
  const id = String(userId || "").trim() || "anon";
  return `briclog-brand-session-v1-${id}`;
}

export function readBrandWorkspaceSession(userId) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(brandSessionStorageKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeBrandWorkspaceSession(userId, session) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      brandSessionStorageKey(userId),
      JSON.stringify(session)
    );
  } catch {
    /* ignore */
  }
}

export function emitBlankBrandSession() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(BRAND_BLANK_SESSION_EVENT));
}

export function emitBrandWorkspaceSelected(brandId, formSeed = null) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(BRAND_WORKSPACE_SELECTED_EVENT, {
      detail: { brandId, form: formSeed },
    })
  );
}

/** draft·폼에 남은 꽃집/간식 잔재 제거 — 가구·전시 주제 */
export function sanitizeFormInputIndustryScope(form = {}, industryKey = "") {
  if (!form || typeof form !== "object") return form;
  const key = industryKey || resolveBriclogIndustryKey(form);
  if (key !== "furniture") return form;

  const topicBlob = `${form.topic || ""} ${form.mainKeyword || ""} ${form.brandName || ""}`;
  const next = { ...form };

  if (/꽃|플라워|flower/i.test(String(next.industry || ""))) {
    next.industry = "가구";
  }

  for (const field of [
    "includePhrases",
    "excludePhrases",
    "storeFeatures",
    "brandDescription",
    "brandFeedbackBrief",
  ]) {
    const val = String(next[field] || "");
    if (/향기|리본|여름\s*꽃|꽃다발|알레르기|원재료|성분표|급여/.test(val)) {
      next[field] = "";
    }
  }

  if (/라인업|3\s*종|전시/.test(topicBlob) && !/붙박이|붙박/.test(topicBlob)) {
    for (const field of ["storeFeatures", "brandDescription", "topic"]) {
      const val = String(next[field] || "");
      if (/붙박이\s*장|붙박이장/.test(val)) {
        next[field] = val.replace(/붙박이\s*장|붙박이장/g, "라인업");
      }
    }
  }

  return next;
}
