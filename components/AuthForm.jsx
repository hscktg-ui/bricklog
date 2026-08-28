"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { mapAuthError } from "@/lib/auth/messages";
import {
  loadSavedEmail,
  persistSavedEmail,
} from "@/lib/auth/preferences";
import { TERMS_VERSION, PRIVACY_VERSION, LEGAL_LINKS } from "@/lib/auth/legalVersions";
import { getAuthCallbackUrl, getResetPasswordUrl } from "@/lib/auth/redirect";
import { getEnabledOAuthProviders } from "@/lib/auth/providers";
import { fetchWithAuth } from "@/lib/api/clientAuth";
import PasswordField from "@/components/auth/PasswordField";
import PhoneSmsVerifyFields from "@/components/auth/PhoneSmsVerifyFields";
import SmsSignupConfigBanner from "@/components/auth/SmsSignupConfigBanner";
import SocialAuthButtons from "@/components/auth/SocialAuthButtons";
import {
  AUTH_FIELD_CLASS,
  AUTH_FIELD_ERROR_CLASS,
  AUTH_MOBILE_PAGE_CLASS,
  AUTH_SHELL_CLASS,
  AUTH_PRIMARY_BTN_CLASS,
  AUTH_SECONDARY_BTN_CLASS,
  AUTH_SURFACE_CLASS,
  AUTH_VISION_SCOPE_CLASS,
  AUTH_CHECKBOX_CLASS,
  AUTH_MUTED_TEXT_CLASS,
  AUTH_LINK_CLASS,
  AUTH_WARN_SURFACE_CLASS,
  AUTH_ERROR_SURFACE_CLASS,
  AUTH_EYEBROW,
  AUTH_TITLE,
  AUTH_MODE_SEGMENT_SHELL,
  AUTH_MODE_SEGMENT_ACTIVE,
  AUTH_MODE_SEGMENT_IDLE,
  AUTH_TRUST_PANEL,
  AUTH_STEP_PILL,
  AUTH_STEP_PILL_ACTIVE,
  AUTH_LABEL_CLASS,
  AUTH_CLOSE_BTN_CLASS,
} from "@/lib/ui/authFieldStyles";
import Logo from "./Logo";
import { BRICLOG_SLOGAN_SHORT } from "@/lib/brand/slogan";
import { isSignupPhoneOptional } from "@/lib/config/productFlags";
import { normalizeKoreanMobile } from "@/lib/sms/phoneNormalize";
import { resolveSignupPhoneForSignup } from "@/lib/auth/signupPhonePayload";
import { getSignupTrustCopy } from "@/lib/auth/signupTrustCopy";
import {
  isSignupSubmitLocked,
  resolveSignupBlockReason,
} from "@/lib/auth/signupFormGate";
import { getPublicSmsSenderLabel } from "@/lib/sms/smsDisplay";
import { peekPublicTestSignupDraft } from "@/lib/publicTest/restorePublicTestSignupDraft";
import {
  getSignupAttributionSource,
  recordLoginFailure,
  recordLoginIntent,
  recordSignupFunnelStep,
} from "@/lib/analytics/signupIntent";
import { classifyAuthError } from "@/lib/auth/authErrorCode";
import { applyServerAuthSession } from "@/lib/auth/postSignupSession";


const MODES = {
  login: "login",
  signup: "signup",
  reset: "reset",
};

const EMAIL_CHECK_DEBOUNCE_MS = 800;

export default function AuthForm({
  onToast,
  onAuthSuccess,
  initialMode = MODES.login,
  onClose,
  embedded = false,
  /** admin_gate · auth_modal · landing_* (login intent 집계) */
  authContext = "auth_modal",
}) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [saveEmail, setSaveEmail] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [marketingAgreed, setMarketingAgreed] = useState(false);
  const [signupPhone, setSignupPhone] = useState("");
  const [phoneVerificationId, setPhoneVerificationId] = useState(null);
  const [phoneSmsVerified, setPhoneSmsVerified] = useState(false);
  const [phoneRegistered, setPhoneRegistered] = useState(false);
  const [phoneCheckMsg, setPhoneCheckMsg] = useState("");
  const [phoneChecking, setPhoneChecking] = useState(false);
  const [emailRegistered, setEmailRegistered] = useState(false);
  const [emailCheckMsg, setEmailCheckMsg] = useState("");
  const [emailChecking, setEmailChecking] = useState(false);
  const [signupLimited, setSignupLimited] = useState(false);
  const [signupLimitMessage, setSignupLimitMessage] = useState("");
  const emailCheckTimer = useRef(null);
  const lastCheckedEmailRef = useRef("");
  const prevEmailTrimRef = useRef("");
  const signupPhoneE164Ref = useRef("");
  const [publicTestDraft, setPublicTestDraft] = useState(null);

  const hasSocial = getEnabledOAuthProviders().length > 0;
  const showSocial =
    hasSocial && (mode === MODES.login || mode === MODES.signup);

  useEffect(() => {
    const saved = loadSavedEmail();
    if (saved) {
      setEmail(saved);
      setSaveEmail(true);
    }
  }, []);

  useEffect(() => {
    if (mode !== MODES.signup) {
      setPublicTestDraft(null);
      return;
    }
    const draft = peekPublicTestSignupDraft();
    if (draft?.brandName || draft?.topic || draft?.region) {
      setPublicTestDraft(draft);
    } else {
      setPublicTestDraft(null);
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== MODES.signup) return;
    recordSignupFunnelStep("modal_open", getSignupAttributionSource());
  }, [mode]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/launch/flags")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.reset) return;
        setSignupLimited(Boolean(data.reset.signupLimited));
        setSignupLimitMessage(String(data.reset.signupLimitMessage || ""));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setMode(initialMode);
    setSignupPhone("");
    signupPhoneE164Ref.current = "";
    setPhoneVerificationId(null);
    setPhoneSmsVerified(false);
    setPhoneRegistered(false);
    setPhoneCheckMsg("");
    setEmailRegistered(false);
    setEmailCheckMsg("");
    lastCheckedEmailRef.current = "";
  }, [initialMode]);

  const handleSignupPhoneChange = useCallback((value) => {
    setSignupPhone(value);
    setPhoneRegistered(false);
    setPhoneCheckMsg("");
    const norm = normalizeKoreanMobile(value);
    if (!norm.ok) return;
    if (norm.e164 === signupPhoneE164Ref.current) return;
    signupPhoneE164Ref.current = norm.e164;
    setPhoneVerificationId(null);
    setPhoneSmsVerified(false);
  }, []);

  const handlePhoneAvailabilityChange = useCallback(
    ({ registered, message, checking }) => {
      setPhoneRegistered(registered);
      setPhoneCheckMsg(message);
      setPhoneChecking(checking);
    },
    []
  );

  const handlePhoneVerified = useCallback(({ verificationId }) => {
    setPhoneVerificationId(verificationId);
    setPhoneSmsVerified(true);
  }, []);

  const runEmailAvailabilityCheck = useCallback(
    async (value) => {
      const trimmed = value.trim();
      if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        setEmailRegistered(false);
        setEmailCheckMsg("");
        setEmailChecking(false);
        lastCheckedEmailRef.current = "";
        return;
      }
      if (lastCheckedEmailRef.current === trimmed.toLowerCase()) {
        return;
      }
      setEmailChecking(true);
      try {
        const res = await fetch(
          `/api/auth/check-email?email=${encodeURIComponent(trimmed)}`
        );
        const data = await res.json().catch(() => ({}));
        if (!data.ok) {
          setEmailRegistered(false);
          setEmailCheckMsg(
            data.userMessage || "이메일을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요."
          );
          return;
        }
        setEmailRegistered(Boolean(data.registered));
        setEmailCheckMsg(data.userMessage || "");
        lastCheckedEmailRef.current = trimmed.toLowerCase();
      } catch {
        setEmailRegistered(false);
        setEmailCheckMsg("");
      } finally {
        setEmailChecking(false);
      }
    },
    []
  );

  useEffect(() => {
    if (mode !== MODES.signup) return undefined;
    const trimmed = email.trim().toLowerCase();
    if (trimmed !== prevEmailTrimRef.current) {
      prevEmailTrimRef.current = trimmed;
      setEmailRegistered(false);
      setEmailCheckMsg("");
      lastCheckedEmailRef.current = "";
    }
    clearTimeout(emailCheckTimer.current);
    emailCheckTimer.current = setTimeout(() => {
      runEmailAvailabilityCheck(email);
    }, EMAIL_CHECK_DEBOUNCE_MS);
    return () => clearTimeout(emailCheckTimer.current);
  }, [email, mode, runEmailAvailabilityCheck]);

  const finalizeAuthenticatedSession = useCallback(
    async ({ successToast, trackSignupSuccess = false }) => {
      try {
        if (trackSignupSuccess) {
          await fetchWithAuth("/api/auth/terms", {
            method: "POST",
            body: JSON.stringify({
              termsAgreed: true,
              privacyAgreed: true,
              marketingAgreed,
            }),
          });
        }
        await fetchWithAuth("/api/auth/profile", { method: "POST" });
      } catch {
        /* 프로필 테이블 미적용 시에도 로그인은 유지 */
      }
      persistSavedEmail(email, saveEmail);
      if (trackSignupSuccess) {
        recordSignupFunnelStep("signup_success", getSignupAttributionSource());
      }
      onToast?.(successToast, "success");
      onAuthSuccess?.();
    },
    [email, saveEmail, marketingAgreed, onToast, onAuthSuccess]
  );

  const redirectToLoginForExistingEmail = useCallback(
    (message) => {
      setMode(MODES.login);
      onToast?.(
        message ||
          "이미 가입된 이메일입니다. 로그인 탭에서 기존 비밀번호를 입력해 주세요.",
        "error"
      );
    },
    [onToast]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isSupabaseConfigured) {
      onToast?.(
        "지금은 로그인을 이용할 수 없습니다. 잠시 후 다시 시도해 주세요.",
        "error"
      );
      return;
    }

    if (mode === MODES.signup && !termsAgreed) {
      onToast?.("이용약관과 개인정보처리방침에 동의해 주세요.", "error");
      return;
    }

    if (mode === MODES.signup) {
      const blockReason = resolveSignupBlockReason({
        termsAgreed,
        emailRegistered,
        phoneOptional: isSignupPhoneOptional(),
        phoneBlocksSignup:
          !isSignupPhoneOptional() &&
          (!phoneSmsVerified || !phoneVerificationId || phoneRegistered),
        phoneAvailabilityBlocks:
          !isSignupPhoneOptional() &&
          signupPhone.trim().length > 0 &&
          phoneRegistered,
        password,
      });
      if (blockReason) {
        onToast?.(blockReason, "error");
        return;
      }
    }

    setLoading(true);
    const callbackUrl = getAuthCallbackUrl();

    try {
      if (mode === MODES.reset) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: getResetPasswordUrl() || callbackUrl,
        });
        if (error) throw error;
        onToast?.(
          "브릭로그(BRICLOG) 제목의 재설정 메일을 보냈습니다. 메일함·스팸함을 확인해 주세요.",
          "success"
        );
        setMode(MODES.login);
        return;
      }

      if (mode === MODES.signup) {
        recordSignupFunnelStep("form_submit", getSignupAttributionSource());
        if (signupLimited) {
          onToast?.(
            signupLimitMessage ||
              "지금은 품질 안정화 기간이라 신규 가입을 잠시 받지 않습니다.",
            "error"
          );
          return;
        }

        if (emailRegistered) {
          redirectToLoginForExistingEmail(
            "이미 가입된 이메일입니다. 로그인 탭에서 기존 비밀번호를 입력해 주세요. 비밀번호를 잊으셨다면 비밀번호 찾기를 이용해 주세요."
          );
          return;
        }

        const { contactPhone, signupPhoneVerificationId } =
          resolveSignupPhoneForSignup({
            phoneSmsVerified,
            phoneVerificationId,
            signupPhone,
          });

        const regRes = await fetch("/api/auth/signup/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            password,
            marketingAgreed,
            phone: contactPhone,
            phoneVerificationId: signupPhoneVerificationId,
          }),
        });
        const regData = await regRes.json().catch(() => ({}));
        if (!regRes.ok || !regData.ok) {
          if (regData.code === "EMAIL_TAKEN") {
            redirectToLoginForExistingEmail(regData.userMessage);
            return;
          }
          onToast?.(
            regData.userMessage ||
              "가입에 실패했습니다. 잠시 후 다시 시도해 주세요.",
            "error"
          );
          return;
        }

        let sessionReady = false;
        if (regData.session?.access_token && regData.session?.refresh_token) {
          const { error: sessionErr } = await supabase.auth.setSession({
            access_token: regData.session.access_token,
            refresh_token: regData.session.refresh_token,
          });
          sessionReady = !sessionErr;
          if (sessionReady) {
            for (let i = 0; i < 4; i += 1) {
              const { data: sessionData } = await supabase.auth.getSession();
              if (sessionData?.session) break;
              await new Promise((r) => setTimeout(r, 120));
            }
          }
        }

        if (!sessionReady && regData.needsLogin) {
          onToast?.(
            regData.userMessage ||
              "가입되었습니다. 로그인 화면에서 같은 이메일·비밀번호로 로그인해 주세요.",
            "success"
          );
          setMode(MODES.login);
          return;
        }

        if (!sessionReady) {
          onToast?.(
            "가입은 완료됐지만 자동 로그인에 실패했습니다. 로그인 화면에서 다시 시도해 주세요.",
            "error"
          );
          setMode(MODES.login);
          return;
        }

        await finalizeAuthenticatedSession({
          successToast:
            "가입되었습니다. 닉네임·호칭은 로그인 후 안내에서 입력할 수 있어요.",
          trackSignupSuccess: true,
        });
        return;
      }

      if (mode === MODES.login && authContext === "admin_gate") {
        recordLoginIntent(authContext);
      }

      await applyServerAuthSession(email, password);
      await finalizeAuthenticatedSession({
        successToast: "로그인되었습니다.",
        trackSignupSuccess: false,
      });
    } catch (err) {
      if (mode === MODES.login) {
        const { code } = classifyAuthError(err?.message);
        recordLoginFailure(code, authContext);
      }
      const mapped = mapAuthError(err.message);
      if (mode === MODES.signup && /요청이 너무 많/i.test(mapped)) {
        onToast?.(
          "가입 시도가 많습니다. 1~2분 뒤 다시 시도해 주세요.",
          "error"
        );
      } else {
        onToast?.(mapped, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const title =
    mode === MODES.signup
      ? "회원가입"
      : mode === MODES.reset
        ? "비밀번호 재설정"
        : "로그인";

  const phoneOptional = isSignupPhoneOptional();
  const signupTrust = getSignupTrustCopy({
    phoneRequired: !phoneOptional,
    smsSenderLabel: getPublicSmsSenderLabel(),
    publicTestDraft,
  });
  const signupPhoneFilled = signupPhone.trim().length > 0;
  const phoneBlocksSignup =
    !phoneOptional &&
    (!phoneSmsVerified ||
      !phoneVerificationId ||
      phoneRegistered);
  const phoneAvailabilityBlocks =
    !phoneOptional && signupPhoneFilled && phoneRegistered;
  const signupBlockReason =
    mode === MODES.signup
      ? resolveSignupBlockReason({
          termsAgreed,
          emailRegistered,
          phoneOptional,
          phoneBlocksSignup,
          phoneAvailabilityBlocks,
          password,
        })
      : "";
  const signupSubmitDisabled = isSignupSubmitLocked({ loading, signupLimited });

  const signupSubmitLabel = (() => {
    if (loading) return "처리 중…";
    if (mode === MODES.reset) return "재설정 메일 보내기";
    if (mode === MODES.login) return "로그인";
    if (phoneBlocksSignup) return "휴대폰 인증 후 가입";
    return "가입하기";
  })();

  const shell = (
    <div
      className={`${AUTH_VISION_SCOPE_CLASS} ${AUTH_SURFACE_CLASS} ${AUTH_SHELL_CLASS} ${
        embedded ? "relative" : ""
      }`}
    >
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className={AUTH_CLOSE_BTN_CLASS}
        >
          ✕
        </button>
      )}
      <div className="mb-4 flex flex-col items-center text-center">
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="flex flex-col items-center gap-1.5 rounded-2xl px-2 py-1 transition active:brightness-[0.97] hover:bg-[var(--vision-accent-soft,rgba(3,199,90,0.08))]"
            aria-label="랜딩으로"
          >
            <Logo className="max-w-[180px]!" />
            <p className="text-[11px] leading-snug text-[var(--vision-muted)]">
              {BRICLOG_SLOGAN_SHORT}
            </p>
          </button>
        ) : (
          <>
            <Logo className="max-w-[180px]!" />
            <p className="mt-1.5 text-[11px] leading-snug text-[var(--vision-muted)]">
              {BRICLOG_SLOGAN_SHORT}
            </p>
          </>
        )}
        <p className={`${AUTH_EYEBROW} mt-4`}>Account</p>
        <h1 className={`${AUTH_TITLE} mt-1`}>{title}</h1>
      </div>

      {mode !== MODES.reset ? (
        <div
          className={`${AUTH_MODE_SEGMENT_SHELL} mb-4`}
          role="tablist"
          aria-label="로그인 또는 회원가입"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === MODES.login}
            className={
              mode === MODES.login ? AUTH_MODE_SEGMENT_ACTIVE : AUTH_MODE_SEGMENT_IDLE
            }
            onClick={() => setMode(MODES.login)}
          >
            로그인
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === MODES.signup}
            className={
              mode === MODES.signup ? AUTH_MODE_SEGMENT_ACTIVE : AUTH_MODE_SEGMENT_IDLE
            }
            onClick={() => setMode(MODES.signup)}
          >
            회원가입
          </button>
        </div>
      ) : null}

      {mode === MODES.signup && !phoneOptional ? (
        <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
          <span
            className={`${AUTH_STEP_PILL} ${
              phoneSmsVerified ? AUTH_STEP_PILL_ACTIVE : ""
            }`}
          >
            ① 휴대폰 문자
          </span>
          <span className="text-[10px] text-[var(--vision-muted)]" aria-hidden>
            →
          </span>
          <span
            className={`${AUTH_STEP_PILL} ${
              phoneSmsVerified && !emailRegistered ? AUTH_STEP_PILL_ACTIVE : ""
            }`}
          >
            ② 이메일·비밀번호
          </span>
        </div>
      ) : null}

      {mode === MODES.signup && publicTestDraft?.brandName ? (
        <div className="mt-4 rounded-2xl border border-[var(--vision-accent-ring,rgba(3,199,90,0.22))] bg-[var(--vision-accent-soft,rgba(3,199,90,0.08))] px-4 py-3 text-center">
          <p className="text-[12px] font-semibold leading-snug text-[var(--vision-ink)]">
            「{publicTestDraft.brandName}」 테스트 그대로 이번 달 운영이 이어집니다
          </p>
          {publicTestDraft.topic ? (
            <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[#4E5968]">
              {publicTestDraft.topic}
            </p>
          ) : null}
          {phoneOptional ? (
            <p className="mt-2 text-[11px] text-[#03A94D]">
              휴대폰 인증은 건너뛰고 이메일만으로 가입할 수 있어요
            </p>
          ) : null}
        </div>
      ) : null}

      {!isSupabaseConfigured && (
        <p className={`mt-3 ${AUTH_ERROR_SURFACE_CLASS}`}>
          지금은 로그인을 이용할 수 없습니다.
        </p>
      )}

      {showSocial && (
        <div className="mt-4">
          <SocialAuthButtons onToast={onToast} disabled={loading} />
          <p className="my-4 text-center text-[11px] text-[var(--vision-muted,#5a6b62)]">또는 이메일</p>
        </div>
      )}

      {mode === MODES.signup && signupLimited ? (
        <p className={`mt-3 ${AUTH_WARN_SURFACE_CLASS}`}>
          {signupLimitMessage ||
            "지금은 품질 안정화 기간이라 신규 가입을 잠시 받지 않습니다."}
        </p>
      ) : null}

      {mode === MODES.signup && !signupLimited ? (
        <SmsSignupConfigBanner phoneRequired={!phoneOptional} />
      ) : null}

      {mode === MODES.signup && !signupLimited ? (
        <div className={`mt-3 ${AUTH_TRUST_PANEL}`}>
          <p className="text-[13px] font-semibold text-[var(--vision-ink,#0f1a14)]">
            {signupTrust.headline}
          </p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--vision-muted,#5a6b62)]">
            {signupTrust.body}
          </p>
          <div className="mt-2 space-y-1 text-[11px] leading-relaxed text-[var(--vision-muted,#5a6b62)]">
            {signupTrust.emailHint ? <p>{signupTrust.emailHint}</p> : null}
            {signupTrust.smsHint ? <p>{signupTrust.smsHint}</p> : null}
            {signupTrust.planHint ? (
              <p className="font-medium text-[var(--vision-ink,#0f1a14)]">
                {signupTrust.planHint}
              </p>
            ) : null}
            {signupTrust.onboardingHint ? (
              <p className="font-medium text-[var(--vision-ink,#0f1a14)]">
                {signupTrust.onboardingHint}
              </p>
            ) : null}
            {signupTrust.workshopHint ? (
              <p>{signupTrust.workshopHint}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 sm:space-y-3">
        {mode === MODES.signup && !phoneOptional ? (
          <PhoneSmsVerifyFields
            purpose="signup"
            phone={signupPhone}
            onPhoneChange={handleSignupPhoneChange}
            disabled={loading}
            onToast={onToast}
            onAvailabilityChange={handlePhoneAvailabilityChange}
            onVerified={handlePhoneVerified}
          />
        ) : null}

        <div>
          <label htmlFor="auth-email" className={AUTH_LABEL_CLASS}>
            {mode === MODES.signup && !phoneOptional ? "로그인 이메일" : "이메일"}
          </label>
          <input
            id="auth-email"
            type="email"
            required
            autoComplete="email"
            aria-label="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={`${AUTH_FIELD_CLASS} ${
              mode === MODES.signup && emailRegistered
                ? AUTH_FIELD_ERROR_CLASS
                : ""
            }`}
          />
          {mode === MODES.signup && (emailCheckMsg || emailChecking) ? (
            <p
              className={`mt-1 min-h-[1.25rem] text-[11px] ${
                emailRegistered ? "text-[#E42939]" : "text-[#03A94D]"
              }`}
              role="status"
            >
              {emailChecking ? "이메일 확인 중…" : emailCheckMsg}
            </p>
          ) : mode === MODES.signup ? (
            <p className="mt-1 min-h-[1.25rem] text-[11px] text-transparent" aria-hidden>
              ·
            </p>
          ) : null}
          {mode === MODES.signup && emailRegistered ? (
            <button
              type="button"
              className={`${AUTH_LINK_CLASS} mt-1.5 text-[12px] font-semibold`}
              onClick={() =>
                redirectToLoginForExistingEmail(
                  "로그인 탭으로 이동했습니다. 기존 비밀번호를 입력해 주세요."
                )
              }
            >
              로그인 탭으로 이동
            </button>
          ) : null}
        </div>

        {mode !== MODES.reset && (
          <div>
            <label htmlFor="auth-password" className={AUTH_LABEL_CLASS}>
              비밀번호
            </label>
            <PasswordField
              id="auth-password"
              value={password}
              onChange={setPassword}
              minLength={6}
              autoComplete={
                mode === MODES.signup ? "new-password" : "current-password"
              }
              placeholder={
                mode === MODES.signup ? "6자 이상 입력" : "비밀번호"
              }
            />
          </div>
        )}

        {mode === MODES.signup && phoneOptional ? (
          <>
            <details className="rounded-2xl border border-[#E8EBED] bg-[#FAFBFC] px-3 py-2.5 open:pb-3">
              <summary className="cursor-pointer list-none text-[13px] font-semibold text-[#4E5968] [&::-webkit-details-marker]:hidden">
                휴대폰 인증 (선택)
              </summary>
              <div className="mt-3 border-t border-[#E8EBED] pt-3">
                <PhoneSmsVerifyFields
                  purpose="signup"
                  phone={signupPhone}
                  onPhoneChange={handleSignupPhoneChange}
                  disabled={loading}
                  onToast={onToast}
                  onAvailabilityChange={handlePhoneAvailabilityChange}
                  onVerified={handlePhoneVerified}
                />
              </div>
            </details>
            <p className={`text-[12px] leading-relaxed ${AUTH_MUTED_TEXT_CLASS} sm:text-[11px]`}>
              이메일·비밀번호만으로 가입할 수 있어요. 샘플이 있으면 작업실로 바로 이어집니다.
            </p>
          </>
        ) : null}

        {mode === MODES.signup && !phoneOptional ? (
          <p className={`text-[12px] leading-relaxed ${AUTH_MUTED_TEXT_CLASS} sm:text-[11px]`}>
            휴대폰 번호는 한 계정에 하나만 등록됩니다. 문자 인증 후 위 이메일·비밀번호로
            로그인합니다. 닉네임·호칭은 로그인 뒤 안내에서 입력할 수 있어요.
          </p>
        ) : null}

        {mode === MODES.signup && (
          <div className={`text-[12px] ${AUTH_MUTED_TEXT_CLASS}`}>
            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                checked={termsAgreed}
                onChange={(e) => setTermsAgreed(e.target.checked)}
                className={`mt-0.5 h-4 w-4 shrink-0 ${AUTH_CHECKBOX_CLASS}`}
              />
              <span>
                <Link
                  href={LEGAL_LINKS.terms}
                  target="_blank"
                  className={AUTH_LINK_CLASS}
                >
                  이용약관
                </Link>
                {" · "}
                <Link
                  href={LEGAL_LINKS.privacy}
                  target="_blank"
                  className={AUTH_LINK_CLASS}
                >
                  개인정보처리방침
                </Link>
                에 동의 (필수)
              </span>
            </label>
            <details className="mt-2">
              <summary className={`cursor-pointer ${AUTH_MUTED_TEXT_CLASS}`}>
                선택 동의
              </summary>
              <label className="mt-2 flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={marketingAgreed}
                  onChange={(e) => setMarketingAgreed(e.target.checked)}
                  className={`h-4 w-4 ${AUTH_CHECKBOX_CLASS}`}
                />
                <span>마케팅 정보 수신</span>
              </label>
            </details>
          </div>
        )}

        {mode === MODES.login && isSupabaseConfigured && (
          <div className={`flex flex-wrap items-center justify-between gap-2 text-[12px] ${AUTH_MUTED_TEXT_CLASS}`}>
            <label className="flex cursor-pointer items-center gap-1.5">
              <input
                type="checkbox"
                checked={saveEmail}
                onChange={(e) => {
                  setSaveEmail(e.target.checked);
                  if (!e.target.checked) persistSavedEmail("", false);
                }}
                className={`h-3.5 w-3.5 ${AUTH_CHECKBOX_CLASS}`}
              />
              아이디 저장
            </label>
            <button
              type="button"
              className="text-[var(--vision-accent-deep,#03a94d)] hover:underline"
              onClick={() => setMode(MODES.reset)}
            >
              비밀번호 찾기
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={signupSubmitDisabled}
          className={AUTH_PRIMARY_BTN_CLASS}
        >
          {signupSubmitLabel}
        </button>

        {signupBlockReason ? (
          <p className="text-center text-[11px] leading-relaxed text-[#E42939]" role="status">
            {signupBlockReason}
          </p>
        ) : null}

      </form>

      <div className="mt-4 flex flex-col items-center gap-2 text-[12px]">
        {mode === MODES.signup && onClose ? (
          <button
            type="button"
            className={`${AUTH_SECONDARY_BTN_CLASS} w-full max-w-xs`}
            onClick={onClose}
          >
            가입 없이 샘플만 보기
          </button>
        ) : null}
        {mode === MODES.reset ? (
          <button
            type="button"
            className={AUTH_LINK_CLASS}
            onClick={() => setMode(MODES.login)}
          >
            로그인으로 돌아가기
          </button>
        ) : null}
      </div>
    </div>
  );

  if (embedded) return shell;

  return (
    <div className={AUTH_MOBILE_PAGE_CLASS}>
      {shell}
    </div>
  );
}
