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

/** 명시적 opt-in만 — 기본은 항상 완성 편집본 배달 */
export function isHardOutputGate() {
  return process.env.NEXT_PUBLIC_BRICLOG_HARD_OUTPUT === "true";
}

/** 발행 가능·파이프라인 검증 완료 여부 (UI·복사 단일 게이트) */
export function isVerifiedBlogOutput(result = {}, blog = {}) {
  const m = blog?._meta || {};
  const r = result?.meta || {};
  const publishReady =
    m.publishReady === true ||
    m.primaryDirective?.publishReady === true ||
    m.aiEditorAudit?.publishReady === true;
  const pipelineVerified =
    r.v2PipelineVerified === true ||
    r.v3PipelineVerified === true ||
    m.v2PipelineVerified === true ||
    m.writtenFromVerifiedResearch === true;
  const passOutput = r.passOutput === true || m.passOutput === true;
  return (
    publishReady &&
    passOutput &&
    pipelineVerified &&
    result.withheld !== true &&
    r.softPass !== true &&
    m.softPass !== true &&
    m.deliveryPreview !== true &&
    !m.draftFallback &&
    !m.missionFallbackUi
  );
}

/** 가입 시 휴대폰 SMS — 출시·프로덕션 기본 선택(이메일만으로 가입 가능). false로만 필수 강제 */
export function isSignupPhoneOptional() {
  if (process.env.NEXT_PUBLIC_BRICLOG_SIGNUP_PHONE_OPTIONAL === "false") {
    return false;
  }
  return (
    process.env.NEXT_PUBLIC_BRICLOG_SIGNUP_PHONE_OPTIONAL === "true" ||
    isLaunchBuild()
  );
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
