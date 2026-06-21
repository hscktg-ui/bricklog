/** 가입·로그인 CTA 출처 — admin 표시용 (랜딩 copy SSOT와 정렬) */

export const SIGNUP_SOURCE_LABELS = {
  landing_nav: "Nav · 작업실 만들기",
  landing_footer: "Footer · 작업실 만들기",
  landing_hero: "Hero · 무료 시작",
  landing_sticky: "Sticky · 무료 시작",
  public_test_result: "샘플 결과 · 가입",
  public_test_sticky: "샘플 sticky · 저장",
  public_test_error: "샘플 오류 · 가입",
  public_test_quota: "쿼터 초과 · 가입",
  oauth_google: "Google OAuth",
  oauth_kakao: "Kakao OAuth",
  oauth_naver: "Naver OAuth",
  unknown: "출처 미상",
};

export const LOGIN_SOURCE_LABELS = {
  landing_nav: "Nav · 로그인",
  landing_hero: "Hero · 로그인",
  landing_sticky: "Sticky · 로그인",
  landing_footer: "Footer · 로그인",
  admin_gate: "Admin 게이트",
  auth_modal: "로그인 모달",
  unknown: "출처 미상",
};

export const LOGIN_FAIL_HINTS = {
  invalid_credentials:
    "이메일·비밀번호 불일치 — 비밀번호 찾기 UX·가입 전 샘플만 본 사용자인지 확인.",
  email_not_confirmed:
    "미확인 이메일 — 확인 메일 재발송·스팸함 안내 문구 점검.",
  rate_limit:
    "요청 과다 — 동일 IP·짧은 시간 반복 시도. Supabase Auth rate limit 확인.",
  provider_disabled:
    "소셜 로그인 미설정 — 이메일 로그인 안내가 보이는지 확인.",
  already_registered:
    "가입 CTA에서 로그인 유도 copy(이미 가입?)가 보이는지 확인.",
  password_too_short: "비밀번호 규칙 안내 — 6자+ 메시지 노출 확인.",
  invalid_email: "이메일 형식 검증·placeholder 점검.",
  cancelled: "소셜 로그인 취소 — 정상. 전환 이슈 아님.",
  link_expired: "비밀번호 재설정 링크 만료 — 재요청 UX 확인.",
  session_expired: "세션 만료 — 자동 로그인·refresh 토큰 확인.",
  unknown: "원문 로그·Supabase Auth 대시보드에서 상세 확인.",
};

/** @param {string} source */
export function labelSignupSource(source = "") {
  const key = String(source || "").trim() || "unknown";
  return SIGNUP_SOURCE_LABELS[key] || key.replace(/_/g, " · ");
}

/** @param {string} source */
export function labelLoginSource(source = "") {
  const key = String(source || "").trim() || "unknown";
  return LOGIN_SOURCE_LABELS[key] || key.replace(/_/g, " · ");
}

/** @param {string} code */
export function hintForLoginFail(code = "") {
  const key = String(code || "").trim() || "unknown";
  return LOGIN_FAIL_HINTS[key] || LOGIN_FAIL_HINTS.unknown;
}
