const STORAGE_KEY = "briclog-public-test-signup-draft";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * 가입 직후 공개 테스트 입력값을 블로그 폼에 복원 (1회 소비)
 * @returns {{ brandName?: string, region?: string, topic?: string } | null}
 */
export function peekPublicTestSignupDraft() {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.at && Date.now() - parsed.at > MAX_AGE_MS) return null;
    return {
      brandName: String(parsed.brandName || "").trim() || undefined,
      region: String(parsed.region || "").trim() || undefined,
      topic: String(parsed.topic || "").trim() || undefined,
    };
  } catch {
    return null;
  }
}

export function consumePublicTestSignupDraft() {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.at && Date.now() - parsed.at > MAX_AGE_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    sessionStorage.removeItem(STORAGE_KEY);
    return {
      brandName: String(parsed.brandName || "").trim() || undefined,
      region: String(parsed.region || "").trim() || undefined,
      topic: String(parsed.topic || "").trim() || undefined,
    };
  } catch {
    return null;
  }
}
