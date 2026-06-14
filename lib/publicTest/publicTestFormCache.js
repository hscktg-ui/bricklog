/**
 * 가입 전 브랜드 테스트 — 브라우저별 마지막 입력 캐시 (localStorage)
 * site_visits에는 검색어가 없어, 재방문 시 이 캐시로 폼을 복원합니다.
 */

const STORAGE_DRAFT = "briclog-public-test-form-draft";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/** @typedef {{ brandName: string, region: string, topic: string, sampleId?: string, savedAt?: number }} PublicTestFormDraft */

/**
 * @returns {PublicTestFormDraft | null}
 */
export function loadPublicTestFormCache() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_DRAFT);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const brandName = String(parsed?.brandName || "").trim();
    const region = String(parsed?.region || "").trim();
    const topic = String(parsed?.topic || "").trim();
    if (!brandName || !region || !topic) return null;
    const savedAt = Number(parsed?.savedAt) || 0;
    if (savedAt && Date.now() - savedAt > MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_DRAFT);
      return null;
    }
    return {
      brandName,
      region,
      topic,
      sampleId: parsed?.sampleId ? String(parsed.sampleId) : undefined,
      savedAt: savedAt || Date.now(),
    };
  } catch {
    return null;
  }
}

/**
 * @param {{ brandName?: string, region?: string, topic?: string, sampleId?: string }} draft
 */
export function savePublicTestFormCache(draft = {}) {
  if (typeof window === "undefined") return;
  const brandName = String(draft.brandName || "").trim();
  const region = String(draft.region || "").trim();
  const topic = String(draft.topic || "").trim();
  if (!brandName || !region || !topic) return;
  try {
    localStorage.setItem(
      STORAGE_DRAFT,
      JSON.stringify({
        brandName,
        region,
        topic,
        sampleId: draft.sampleId ? String(draft.sampleId) : undefined,
        savedAt: Date.now(),
      })
    );
  } catch {
    /* private mode */
  }
}

export function clearPublicTestFormCache() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_DRAFT);
  } catch {
    /* ignore */
  }
}
