import { brandCountFromBand, labelForRole } from "@/lib/auth/profileOptions";
import { resolveDirectorName } from "@/lib/dashboard/welcomeDirector";

/** @param {{ preferredTitle?: string } | null} profile */
export function resolvePreferredTitle(profile) {
  const t = profile?.preferredTitle?.trim();
  return t || "디렉터님";
}

/**
 * @param {Record<string, unknown> | null} profile
 * @param {{ email?: string } | null} user
 */
export function buildWelcomeGreeting(profile, user) {
  const name = resolveDirectorName(profile, user);
  const title = resolvePreferredTitle(profile);
  const role = profile?.roleType || "";
  const band = profile?.brandCountBand || "";
  const useCase = profile?.primaryUseCase || "";

  let sub = "오늘도 브랜드의 이야기를 준비해 볼까요?";

  if (role === "agency" || band === "agency_multi" || useCase === "agency_work") {
    sub = "오늘도 클라이언트 콘텐츠를 정리해 볼까요?";
  } else if (
    band === "4_10" ||
    band === "10_plus" ||
    band === "agency_multi" ||
    useCase === "multi_brand"
  ) {
    sub = "오늘은 어떤 브랜드의 이야기를 정리해 볼까요?";
  } else if (useCase === "blog") {
    sub = "오늘은 블로그 초안부터 차분히 맞춰 볼까요?";
  } else if (useCase === "place") {
    sub = "오늘은 플레이스 소식 문구를 정리해 볼까요?";
  } else if (useCase === "instagram") {
    sub = "오늘은 인스타 캡션 톤을 맞춰 볼까요?";
  }

  return {
    headline: `${name} ${title}`,
    sub,
  };
}

function profileDeferStorageKey(userId) {
  return `briclog-profile-defer:${userId}`;
}

function hasMinimalNickname(profile) {
  return String(profile?.nickname || "").trim().length >= 2;
}

/**
 * Dashboard banner / soft reminder until nickname is saved.
 * @param {Record<string, unknown> | null} profile
 */
export function profileNeedsSetup(profile) {
  if (!profile) return true;
  if (profile.profileCompletedAt) return false;
  return !hasMinimalNickname(profile);
}

const MODAL_COOLDOWN_DAYS = 3;

/**
 * Profile popup — hidden until next sign-in after "나중에".
 * @param {Record<string, unknown> | null} profile
 * @param {{ deferredUntilNextSignIn?: boolean, userId?: string | null }} [opts]
 */
export function profileNeedsSetupModal(profile, opts = {}) {
  const userId = opts.userId ?? profile?.id ?? null;
  if (opts.deferredUntilNextSignIn || isProfileModalDeferredForUser(userId)) {
    return false;
  }
  if (!profileNeedsSetup(profile)) return false;

  const skippedAt = profile?.profileSetupSkippedAt;
  if (skippedAt) {
    const ms = Date.now() - new Date(skippedAt).getTime();
    if (ms < MODAL_COOLDOWN_DAYS * 24 * 60 * 60 * 1000) return false;
  }
  return true;
}

/** Hide popup for this login (persists across refresh/tabs). Cleared on sign-out. */
export function deferProfileModalUntilNextSignIn(userId) {
  if (typeof window === "undefined" || !userId) return;
  try {
    localStorage.setItem(profileDeferStorageKey(userId), "1");
    sessionStorage.removeItem("briclog-profile-modal-dismiss-session");
  } catch {
    /* ignore */
  }
}

export function isProfileModalDeferredForUser(userId) {
  if (typeof window === "undefined" || !userId) return false;
  try {
    return localStorage.getItem(profileDeferStorageKey(userId)) === "1";
  } catch {
    return false;
  }
}

export function clearProfileModalDefer(userId) {
  if (typeof window === "undefined" || !userId) return;
  try {
    localStorage.removeItem(profileDeferStorageKey(userId));
  } catch {
    /* ignore */
  }
}

/**
 * @param {Record<string, unknown> | null} profile
 */
export function recommendedPlanFromProfile(profile) {
  const band = profile?.brandCountBand;
  if (band === "agency_multi" || band === "10_plus") return "studio";
  if (band === "4_10" || band === "2_3") return "brand";
  return "free";
}

/**
 * @param {Record<string, unknown> | null} profile
 */
export function defaultMenuFromProfile(profile) {
  const use = profile?.primaryUseCase;
  if (use === "place") return "place";
  if (use === "instagram") return "insta";
  if (use === "image_copy") return "image";
  if (use === "blog") return "blog";
  return "blog";
}

/**
 * @param {Record<string, unknown> | null} profile
 */
export function personalizationBriefFromProfile(profile) {
  if (!profile) return "";
  const lines = [];
  const roleLabel = labelForRole(String(profile.roleType || ""));
  if (roleLabel) lines.push(`운영 역할: ${roleLabel}`);
  const n = brandCountFromBand(String(profile.brandCountBand || ""));
  if (n && n > 1) {
    lines.push(`다수 브랜드 운영(약 ${n}개 규모) — 채널·톤 분리를 유지한다.`);
  }
  const industry = String(profile.mainIndustry || "").trim();
  if (industry) {
    lines.push(`주 업종 맥락: ${industry} (업종에 맞는 예시·톤, 개인 연락처는 본문에 넣지 않는다).`);
  }
  if (profile.roleType === "agency" || profile.brandCountBand === "agency_multi") {
    lines.push("광고대행·다브랜드 맥락 — 브랜드별 톤 혼선을 피한다.");
  }
  return lines.length ? lines.join("\n") : "";
}
