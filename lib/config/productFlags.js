/**
 * 베타·운영 플래그 (NEXT_PUBLIC_* = 클라이언트)
 */

/** 출시 빌드 — NEXT_PUBLIC_BRICLOG_LAUNCH=true 또는 production */
export function isLaunchBuild() {
  if (process.env.NEXT_PUBLIC_BRICLOG_LAUNCH === "false") return false;
  return (
    process.env.NEXT_PUBLIC_BRICLOG_LAUNCH === "true" ||
    process.env.NODE_ENV === "production"
  );
}

/** 가입 시 휴대폰 SMS — 기본 필수. 로컬만 NEXT_PUBLIC_BRICLOG_SIGNUP_PHONE_OPTIONAL=true 로 선택 */
export function isSignupPhoneOptional() {
  return process.env.NEXT_PUBLIC_BRICLOG_SIGNUP_PHONE_OPTIONAL === "true";
}

/** 채널 선택 화면 생략 → 기본 블로그로 바로 작업 (기본 켜짐, false로만 끔) */
export function isFastOnboarding() {
  return process.env.NEXT_PUBLIC_BRICLOG_FAST_ONBOARDING !== "false";
}

/** 입력·버튼은 로컬만, 생성 CTA에서 Context·API 반영 (기본 켜짐) */
export function isDeferFormUntilCommit() {
  return process.env.NEXT_PUBLIC_BRICLOG_DEFER_FORM !== "false";
}

/** 이야기 생성 후 플레이스·인스타·프롬프트 자동 연쇄 (베타 기본 켜짐) */
export function isAutoPipelineAfterBlog() {
  return process.env.NEXT_PUBLIC_BRICLOG_AUTO_PIPELINE !== "false";
}
