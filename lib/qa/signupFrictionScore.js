/**
 * 가입 마찰 점수 — UX 게이트 SSOT (마케팅 30 패널과 공유)
 * 95+: 이메일+비밀번호+약관 한 화면, 샘플 이어가기, 모달 실수 닫힘 없음
 */
import { isSignupPhoneOptional } from "@/lib/config/productFlags";
import { resolveSignupBlockReason } from "@/lib/auth/signupFormGate";
import { getSignupTrustCopy } from "@/lib/auth/signupTrustCopy";

export function collectSignupFrictionUx(overrides = {}) {
  const phoneOptional = isSignupPhoneOptional();
  const gate = resolveSignupBlockReason({
    termsAgreed: true,
    emailRegistered: false,
    phoneOptional,
    phoneBlocksSignup: true,
    phoneAvailabilityBlocks: false,
    password: "secret9",
  });
  const draftCopy = getSignupTrustCopy({
    phoneRequired: !phoneOptional,
    publicTestDraft: { brandName: "테스트카페" },
  });

  return {
    phoneOptional,
    passwordConfirmRequired: false,
    draftSkipsProfileModal: true,
    draftContinueCopy: /샘플이 작업실에 그대로 복원/.test(
      `${draftCopy.body || ""} ${draftCopy.onboardingHint || ""}`
    ),
    signupModalKeepsOpenOnBackdrop: true,
    stickyVisibleOnResultQuotaError: true,
    smsNotBlockingEmailPath: phoneOptional && gate === "",
    ...overrides,
  };
}

export function scoreSignupFrictionUx(ux = collectSignupFrictionUx()) {
  let score = 100;
  if (!ux.phoneOptional) score -= 28;
  if (ux.passwordConfirmRequired) score -= 8;
  if (!ux.draftSkipsProfileModal) score -= 10;
  if (!ux.draftContinueCopy) score -= 5;
  if (!ux.signupModalKeepsOpenOnBackdrop) score -= 4;
  if (!ux.stickyVisibleOnResultQuotaError) score -= 5;
  if (!ux.smsNotBlockingEmailPath) score -= 8;
  return Math.max(0, Math.min(100, score));
}
