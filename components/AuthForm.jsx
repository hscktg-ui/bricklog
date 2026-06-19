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
import SocialAuthButtons from "@/components/auth/SocialAuthButtons";
import {
  AUTH_FIELD_CLASS,
  AUTH_FIELD_ERROR_CLASS,
  AUTH_MOBILE_PAGE_CLASS,
  AUTH_MOBILE_SHELL_CLASS,
  AUTH_PRIMARY_BTN_CLASS,
  AUTH_SECONDARY_BTN_CLASS,
  AUTH_SURFACE_CLASS,
  AUTH_VISION_SCOPE_CLASS,
  AUTH_CHECKBOX_CLASS,
  AUTH_MUTED_TEXT_CLASS,
  AUTH_LINK_CLASS,
  AUTH_WARN_SURFACE_CLASS,
  AUTH_ERROR_SURFACE_CLASS,
} from "@/lib/ui/authFieldStyles";
import Logo from "./Logo";
import { BRICLOG_SLOGAN_SHORT } from "@/lib/brand/slogan";
import LandingDeviceBar from "@/components/landing/LandingDeviceBar";
import LandingWidthShell from "@/components/landing/LandingWidthShell";
import { useLandingPreviewOptional } from "@/components/landing/LandingPreviewContext";
import { isSignupPhoneOptional } from "@/lib/config/productFlags";
import { normalizeKoreanMobile } from "@/lib/sms/phoneNormalize";
import { isObfuscatedDuplicateSignup } from "@/lib/auth/signupResponse";
import {
  resolveSignupPhoneForSignup,
  shouldRunSignupActivate,
} from "@/lib/auth/signupPhonePayload";
import { peekPublicTestSignupDraft } from "@/lib/publicTest/restorePublicTestSignupDraft";
import {
  getSignupAttributionSource,
  recordSignupFunnelStep,
} from "@/lib/analytics/signupIntent";


const MODES = {
  login: "login",
  signup: "signup",
  reset: "reset",
};

const EMAIL_CHECK_DEBOUNCE_MS = 800;

async function ensureEmailActive(email, password) {
  const res = await fetch("/api/auth/ensure-email-active", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim(), password }),
  });
  if (!res.ok) return false;
  const data = await res.json().catch(() => ({}));
  return Boolean(data.ok);
}

async function signInAfterSignup(email, password) {
  let { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (data?.session) return data;

  const activated = await ensureEmailActive(email, password);
  if (activated) {
    ({ data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    }));
    if (data?.session) return data;
  }

  if (error) throw error;
  throw new Error("로그인에 실패했습니다.");
}

export default function AuthForm({
  onToast,
  onAuthSuccess,
  initialMode = MODES.login,
  onClose,
  embedded = false,
  showDevicePreview = false,
}) {
  const landingPreview = useLandingPreviewOptional();
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
          setEmailCheckMsg("");
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

    setLoading(true);
    const callbackUrl = getAuthCallbackUrl();

    try {
      if (mode === MODES.reset) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: getResetPasswordUrl() || callbackUrl,
        });
        if (error) throw error;
        onToast?.("비밀번호 재설정 메일을 보냈습니다.", "success");
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
          onToast?.(
            "이미 가입된 이메일입니다. 로그인하거나 비밀번호 찾기를 이용해 주세요.",
            "error"
          );
          setMode(MODES.login);
          return;
        }

        if (
          !isSignupPhoneOptional() &&
          (!phoneSmsVerified || !phoneVerificationId)
        ) {
          onToast?.("휴대폰 문자 인증을 완료해 주세요.", "error");
          return;
        }

        const { contactPhone, signupPhoneVerificationId, phoneVerifiedForSignup } =
          resolveSignupPhoneForSignup({
            phoneSmsVerified,
            phoneVerificationId,
            signupPhone,
          });

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: callbackUrl,
            data: {
              terms_agreed: true,
              privacy_agreed: true,
              marketing_agreed: marketingAgreed,
              terms_version: TERMS_VERSION,
              privacy_version: PRIVACY_VERSION,
              contact_phone: contactPhone,
              phone_verification_id: signupPhoneVerificationId,
            },
          },
        });
        if (error) throw error;

        if (isObfuscatedDuplicateSignup(data?.user)) {
          onToast?.(
            "이미 가입된 이메일입니다. 로그인하거나 비밀번호 찾기를 이용해 주세요.",
            "error"
          );
          setMode(MODES.login);
          return;
        }

        let phoneHoldOk = false;
        if (signupPhoneVerificationId && contactPhone && data?.user?.id) {
          const holdRes = await fetch("/api/auth/signup/phone-hold", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: data.user.id,
              phoneVerificationId: signupPhoneVerificationId,
              phone: contactPhone,
            }),
          });
          const holdData = await holdRes.json().catch(() => ({}));
          if (!holdRes.ok || !holdData.ok) {
            onToast?.(
              holdData.userMessage ||
                "이미 가입에 사용된 휴대폰 번호입니다. 기존 계정으로 로그인해 주세요.",
              "error"
            );
            setMode(MODES.login);
            return;
          }
          phoneHoldOk = true;
        }

        if (
          shouldRunSignupActivate({
            hasSession: Boolean(data.session),
            phoneVerifiedForSignup,
            phoneHoldOk,
          }) &&
          data?.user?.id
        ) {
          const actRes = await fetch("/api/auth/signup/activate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: data.user.id }),
          });
          const actData = await actRes.json().catch(() => ({}));
          if (!actRes.ok || !actData.ok) {
            onToast?.(
              actData.userMessage || "가입 활성화에 실패했습니다. 로그인을 시도해 주세요.",
              "error"
            );
            setMode(MODES.login);
            return;
          }
        }

        const signedIn = await signInAfterSignup(email, password);
        if (signedIn?.session) {
          try {
            await fetchWithAuth("/api/auth/terms", {
              method: "POST",
              body: JSON.stringify({
                termsAgreed: true,
                privacyAgreed: true,
                marketingAgreed,
              }),
            });
            await fetchWithAuth("/api/auth/profile", { method: "POST" });
          } catch {
            /* 프로필 테이블 미적용 시에도 가입은 유지 */
          }
          persistSavedEmail(email, saveEmail);
          recordSignupFunnelStep("signup_success", getSignupAttributionSource());
          onToast?.(
            "가입되었습니다. 닉네임·호칭은 로그인 후 안내에서 입력할 수 있어요.",
            "success"
          );
          onAuthSuccess?.();
        } else {
          onToast?.(
            "가입은 완료됐지만 자동 로그인에 실패했습니다. 로그인 화면에서 다시 시도해 주세요.",
            "error"
          );
          setMode(MODES.login);
        }
        return;
      }

      const signedIn = await signInAfterSignup(email, password);
      if (!signedIn?.session) {
        throw new Error("로그인에 실패했습니다.");
      }
      persistSavedEmail(email, saveEmail);
      for (let i = 0; i < 4; i += 1) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session) break;
        await new Promise((r) => setTimeout(r, 120));
      }
      try {
        await fetchWithAuth("/api/auth/profile", { method: "POST" });
      } catch {
        /* ignore */
      }
      onToast?.("로그인되었습니다.", "success");
      onAuthSuccess?.();
    } catch (err) {
      onToast?.(mapAuthError(err.message), "error");
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

  const previewDevice = landingPreview?.preview ?? "desktop";
  const setPreviewDevice = landingPreview?.setPreview;
  const simulating = landingPreview?.simulating ?? false;

  const phoneOptional = isSignupPhoneOptional();
  const signupPhoneFilled = signupPhone.trim().length > 0;
  const phoneBlocksSignup =
    !phoneOptional &&
    (!phoneSmsVerified ||
      !phoneVerificationId ||
      phoneRegistered);
  const phoneAvailabilityBlocks =
    !phoneOptional && signupPhoneFilled && phoneRegistered;
  const signupSubmitDisabled =
    loading ||
    signupLimited ||
    (mode === MODES.signup &&
      (!termsAgreed || emailRegistered || phoneAvailabilityBlocks || phoneBlocksSignup));

  const signupSubmitLabel = (() => {
    if (loading) return "처리 중…";
    if (mode === MODES.reset) return "재설정 메일 보내기";
    if (mode === MODES.login) return "로그인";
    if (phoneOptional) return "무료 가입하기";
    if (phoneBlocksSignup) return "휴대폰 인증 후 가입";
    return "가입하기";
  })();

  const signupDisabledReason = (() => {
    if (mode !== MODES.signup || loading || signupLimited) return "";
    if (!termsAgreed) return "이용약관·개인정보처리방침에 동의해 주세요.";
    if (emailRegistered) return "이미 사용 중인 이메일입니다.";
    if (phoneAvailabilityBlocks) return "이미 등록된 휴대폰 번호입니다.";
    if (phoneBlocksSignup) return "휴대폰 문자 인증을 완료해 주세요.";
    return "";
  })();

  const shell = (
    <div
      className={`${AUTH_VISION_SCOPE_CLASS} ${AUTH_SURFACE_CLASS} ${AUTH_MOBILE_SHELL_CLASS} ${
        embedded ? "relative" : ""
      }`}
    >
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-3 top-3 rounded-lg p-1 text-[var(--vision-muted)] hover:bg-[var(--vision-accent-soft,rgba(3,199,90,0.08))]"
        >
          ✕
        </button>
      )}
      <div className="mb-3 flex flex-col items-center">
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="flex flex-col items-center gap-1 rounded-xl px-2 py-1 transition active:brightness-[0.97] hover:bg-[var(--vision-accent-soft,rgba(3,199,90,0.08))]"
            aria-label="랜딩으로"
          >
            <Logo className="max-w-[200px]!" />
            <p className="text-center text-[12px] leading-snug text-[var(--vision-muted)]">
              {BRICLOG_SLOGAN_SHORT}
            </p>
          </button>
        ) : (
          <>
            <Logo className="max-w-[200px]!" />
            <p className="mt-1 text-center text-[12px] leading-snug text-[var(--vision-muted)]">
              {BRICLOG_SLOGAN_SHORT}
            </p>
          </>
        )}
      </div>

      <h1 className="text-center text-lg font-bold text-[var(--vision-ink)]">{title}</h1>

      {mode === MODES.signup && publicTestDraft?.brandName ? (
        <div className="mt-4 rounded-2xl border border-[var(--vision-accent-ring,rgba(3,199,90,0.22))] bg-[var(--vision-accent-soft,rgba(3,199,90,0.08))] px-4 py-3 text-center">
          <p className="text-[12px] font-semibold leading-snug text-[var(--vision-ink)]">
            「{publicTestDraft.brandName}」 테스트 그대로 작업실에 이어집니다
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

      {showDevicePreview &&
        setPreviewDevice &&
        landingPreview?.native !== "mobile" && (
        <div className="mt-4 rounded-xl border border-[#E8EBED] bg-[#FAFBFC] p-3">
          <LandingDeviceBar
            device={previewDevice}
            onChange={setPreviewDevice}
            simulating={simulating}
            native={landingPreview?.native ?? previewDevice}
            compact
          />
          <p className="mt-2 text-center text-[11px] leading-snug text-[#8B95A1]">
            로그인 후에도 같은 화면으로 이어갑니다
          </p>
        </div>
      )}

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

      <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 sm:space-y-3">
        <div>
          <label htmlFor="auth-email" className="mb-1.5 block text-[13px] font-semibold text-[var(--vision-ink,#0f1a14)] sm:text-[12px]">
            이메일
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
        </div>

        {mode !== MODES.reset && (
          <div>
            <label htmlFor="auth-password" className="mb-1.5 block text-[13px] font-semibold text-[var(--vision-ink,#0f1a14)] sm:text-[12px]">
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

        {mode === MODES.signup && (
          <>
            {isSignupPhoneOptional() ? (
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
            ) : (
              <PhoneSmsVerifyFields
                purpose="signup"
                phone={signupPhone}
                onPhoneChange={handleSignupPhoneChange}
                disabled={loading}
                onToast={onToast}
                onAvailabilityChange={handlePhoneAvailabilityChange}
                onVerified={handlePhoneVerified}
              />
            )}
            <p className={`text-[12px] leading-relaxed ${AUTH_MUTED_TEXT_CLASS} sm:text-[11px]`}>
              {isSignupPhoneOptional()
                ? "이메일·비밀번호만으로 가입할 수 있어요."
                : "휴대폰 번호는 한 계정에 하나만 등록됩니다. 문자 인증만 완료하면 바로 이용할 수 있어요."}{" "}
              닉네임·호칭은 로그인 뒤 안내에서 입력할 수 있어요.
            </p>
          </>
        )}

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

        {signupDisabledReason ? (
          <p className="text-center text-[11px] leading-relaxed text-[#E42939]" role="status">
            {signupDisabledReason}
          </p>
        ) : null}

      </form>

      <div className="mt-3 flex flex-col items-center gap-2 text-[12px]">
        {mode === MODES.signup && onClose ? (
          <button
            type="button"
            className="text-[12px] font-medium text-[var(--vision-muted,#5a6b62)] hover:text-[var(--vision-accent-deep,#03a94d)] hover:underline"
            onClick={onClose}
          >
            가입 없이 샘플만 보기
          </button>
        ) : null}
        <div className="flex justify-center gap-2">
        {mode === MODES.login ? (
          <button
            type="button"
            className={AUTH_SECONDARY_BTN_CLASS}
            onClick={() => setMode(MODES.signup)}
          >
            회원가입
          </button>
        ) : mode === MODES.signup ? (
          <button
            type="button"
            className={AUTH_SECONDARY_BTN_CLASS}
            onClick={() => setMode(MODES.login)}
          >
            로그인
          </button>
        ) : (
          <button
            type="button"
            className={AUTH_SECONDARY_BTN_CLASS}
            onClick={() => setMode(MODES.login)}
          >
            로그인으로
          </button>
        )}
        </div>
      </div>
    </div>
  );

  const wrapped =
    showDevicePreview &&
    landingPreview &&
    landingPreview.native !== "mobile" ? (
    <LandingWidthShell>{shell}</LandingWidthShell>
  ) : (
    shell
  );

  if (embedded) return wrapped;

  return (
    <div className={AUTH_MOBILE_PAGE_CLASS}>
      {wrapped}
    </div>
  );
}
