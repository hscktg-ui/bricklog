/**
 * 랜딩 방문마다 sessionStorage 인덱스 순환 (클라이언트 전용)
 */

export const STORAGE_VISIT = "briclog-landing-visit";
export const STORAGE_GREETING = "briclog-landing-greeting-idx";
export const STORAGE_SAMPLE = "briclog-landing-sample-idx";
const STORAGE_SAMPLE_LEGACY = "briclog-landing-sample-set";
/** 샘플 풀 개수 변경 시 이전 인덱스와 어긋나지 않도록 1회 리셋 */
const STORAGE_SAMPLE_POOL_VERSION = "briclog-landing-sample-pool-v5";
export const STORAGE_IDEA = "briclog-landing-content-idea-idx";
/** 세션당 랜딩 시그니처 사운드 1회 */
export const STORAGE_SIGNATURE_PLAYED = "briclog-landing-signature-played";
/** 같은 브라우저 세션에서 인트로 1회만 */
export const STORAGE_INTRO_SESSION_DONE = "briclog-intro-session-done";
/** @deprecated 영구 숨김 — 세션당 1회 정책으로 전환하며 폐기. 잔존 값은 정리만 함 */
export const STORAGE_INTRO_DONE = "briclog-intro-done";

/** 과거 버전이 박아둔 영구 숨김 플래그를 정리해 새 세션마다 다시 뜨도록 함 */
function clearLegacyIntroFlag() {
  try {
    localStorage.removeItem(STORAGE_INTRO_DONE);
  } catch {
    /* private mode */
  }
}

export function shouldShowLandingIntro() {
  if (typeof window === "undefined") return false;
  clearLegacyIntroFlag();
  const params = new URLSearchParams(window.location.search);
  if (params.get("test") === "1" || params.get("skipIntro") === "1") {
    return false;
  }
  return sessionStorage.getItem(STORAGE_INTRO_SESSION_DONE) !== "1";
}

export function markLandingIntroDone() {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_INTRO_SESSION_DONE, "1");
  clearLegacyIntroFlag();
}

/** 개발·재체험용 — 세션 인트로만 초기화 */
export function resetLandingIntroSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_INTRO_SESSION_DONE);
}

export function hasPlayedLandingSignature() {
  if (typeof window === "undefined") return true;
  return sessionStorage.getItem(STORAGE_SIGNATURE_PLAYED) === "1";
}

export function markLandingSignaturePlayed() {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_SIGNATURE_PLAYED, "1");
}

/** 방문 횟수 기록 (세션당) */
export function recordLandingVisit() {
  if (typeof window === "undefined") return;
  const raw = sessionStorage.getItem(STORAGE_VISIT);
  const n = raw !== null ? parseInt(raw, 10) : 0;
  sessionStorage.setItem(
    STORAGE_VISIT,
    String(Number.isNaN(n) ? 1 : n + 1)
  );
}

/**
 * 이번 방문에 쓸 인덱스를 반환하고, 다음 방문용 인덱스를 저장합니다.
 * @param {string} key
 * @param {number} count
 * @returns {number}
 */
export function pickSessionIndex(key, count) {
  if (typeof window === "undefined" || count < 1) return 0;
  if (key === STORAGE_SAMPLE) {
    const poolVer = sessionStorage.getItem(STORAGE_SAMPLE_POOL_VERSION);
    if (poolVer !== "5") {
      sessionStorage.removeItem(STORAGE_SAMPLE);
      sessionStorage.removeItem(STORAGE_SAMPLE_LEGACY);
      sessionStorage.setItem(STORAGE_SAMPLE_POOL_VERSION, "5");
    }
    const legacy = sessionStorage.getItem(STORAGE_SAMPLE_LEGACY);
    if (legacy !== null && sessionStorage.getItem(STORAGE_SAMPLE) === null) {
      sessionStorage.setItem(STORAGE_SAMPLE, legacy);
    }
  }
  const raw = sessionStorage.getItem(key);
  let idx = 0;
  if (raw !== null) {
    const parsed = parseInt(raw, 10);
    if (!Number.isNaN(parsed)) idx = ((parsed % count) + count) % count;
  }
  sessionStorage.setItem(key, String((idx + 1) % count));
  return idx;
}
