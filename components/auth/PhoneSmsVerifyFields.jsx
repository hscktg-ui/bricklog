"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { GREEN_CTA_OUTLINE } from "@/lib/ui/actionButtonStyles";
import { LEGAL_LINKS } from "@/lib/auth/legalVersions";
import { normalizeKoreanMobile } from "@/lib/sms/phoneNormalize";
import { resolveSmsSenderLabel } from "@/lib/sms/smsDisplay";

import { AUTH_FIELD_CLASS } from "@/lib/ui/authFieldStyles";

const fieldClass = AUTH_FIELD_CLASS;

const RESEND_COOLDOWN_SEC = 60;

function phoneDigitsKey(raw) {
  const n = normalizeKoreanMobile(raw);
  return n.ok ? n.e164 : String(raw || "").replace(/\D/g, "");
}

function maskPhone(display) {
  const digits = String(display || "").replace(/\D/g, "");
  if (digits.length < 8) return "인증 완료";
  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}

/**
 * @param {{
 *   phone: string,
 *   onPhoneChange: (v: string) => void,
 *   disabled?: boolean,
 *   purpose?: 'signup' | 'verify',
 *   onVerified?: (payload: { verificationId: string, phone: string }) => void,
 *   onToast?: (msg: string, type?: string) => void,
 *   onAvailabilityChange?: (payload: { registered: boolean, message: string, checking: boolean }) => void,
 *   excludeUserId?: string | null,
 * }} props
 */
export default function PhoneSmsVerifyFields({
  phone,
  onPhoneChange,
  disabled = false,
  purpose = "signup",
  excludeUserId = null,
  onVerified,
  onToast,
  onAvailabilityChange,
}) {
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verificationId, setVerificationId] = useState(null);
  const [otpSent, setOtpSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [senderLabel, setSenderLabel] = useState(() => resolveSmsSenderLabel());
  const [devHint, setDevHint] = useState(null);
  const [lastError, setLastError] = useState(null);
  const phoneKeyRef = useRef("");
  const timerRef = useRef(null);
  const phoneCheckTimer = useRef(null);
  const [phoneTaken, setPhoneTaken] = useState(false);
  const [phoneCheckMsg, setPhoneCheckMsg] = useState("");
  const [phoneChecking, setPhoneChecking] = useState(false);

  useEffect(() => {
    const key = phoneDigitsKey(phone);
    if (key === phoneKeyRef.current) return;
    phoneKeyRef.current = key;
    setVerified(false);
    setVerificationId(null);
    setCode("");
    setOtpSent(false);
    setDevHint(null);
    setLastError(null);
    setResendCooldown(0);
    setPhoneTaken(false);
    setPhoneCheckMsg("");
  }, [phone]);

  const runPhoneAvailabilityCheck = useCallback(
    async (value) => {
      const norm = normalizeKoreanMobile(value);
      if (!norm.ok) {
        setPhoneTaken(false);
        setPhoneCheckMsg("");
        onAvailabilityChange?.({ registered: false, message: "", checking: false });
        return;
      }
      setPhoneChecking(true);
      onAvailabilityChange?.({ registered: false, message: "", checking: true });
      try {
        const res = await fetch(
          `/api/auth/check-phone?phone=${encodeURIComponent(value.trim())}`
        );
        const data = await res.json().catch(() => ({}));
        if (!data.ok) {
          const msg =
            data.userMessage ||
            "휴대폰 번호를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.";
          setPhoneTaken(false);
          setPhoneCheckMsg(msg);
          onAvailabilityChange?.({ registered: false, message: msg, checking: false });
          return;
        }
        const taken = Boolean(data.registered);
        setPhoneTaken(taken);
        setPhoneCheckMsg(data.userMessage || "");
        onAvailabilityChange?.({
          registered: taken,
          message: data.userMessage || "",
          checking: false,
        });
      } catch {
        setPhoneTaken(false);
        setPhoneCheckMsg("");
        onAvailabilityChange?.({ registered: false, message: "", checking: false });
      } finally {
        setPhoneChecking(false);
      }
    },
    [onAvailabilityChange]
  );

  useEffect(() => {
    if (purpose !== "signup") return undefined;
    clearTimeout(phoneCheckTimer.current);
    phoneCheckTimer.current = setTimeout(() => {
      runPhoneAvailabilityCheck(phone);
    }, 450);
    return () => clearTimeout(phoneCheckTimer.current);
  }, [phone, purpose, runPhoneAvailabilityCheck]);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    timerRef.current = setInterval(() => {
      setResendCooldown((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [resendCooldown]);

  const sendOtp = useCallback(async () => {
    if (!phone?.trim()) {
      onToast?.("휴대폰 번호를 입력해 주세요.", "error");
      return;
    }
    if (purpose === "signup" && phoneTaken) {
      onToast?.(
        phoneCheckMsg ||
          "이미 가입에 사용된 휴대폰 번호입니다. 기존 계정으로 로그인해 주세요.",
        "error"
      );
      return;
    }
    setSending(true);
    setLastError(null);
    setDevHint(null);
    try {
      const res = await fetch("/api/auth/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(),
          purpose,
          excludeUserId: excludeUserId || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        const msg = data.userMessage || "인증번호를 보내지 못했습니다.";
        const taken = data.code === "PHONE_TAKEN" || res.status === 409;
        if (taken) {
          setPhoneTaken(true);
          setPhoneCheckMsg(msg);
          onAvailabilityChange?.({
            registered: true,
            message: msg,
            checking: false,
          });
        }
        setLastError(msg);
        onToast?.(msg, "error");
        return;
      }
      if (data.senderDisplay) {
        setSenderLabel(resolveSmsSenderLabel(data.senderDisplay));
      }
      setOtpSent(true);
      setResendCooldown(data.resendCooldownSec ?? RESEND_COOLDOWN_SEC);
      onToast?.(
        data.userMessage ||
          `인증번호를 보냈습니다. ${senderLabel} 번호로 온 문자를 확인해 주세요.`,
        "success"
      );
      if (data.devHint) {
        setDevHint(data.devHint);
      }
    } catch {
      const msg = "인증번호를 보내지 못했습니다. 네트워크를 확인해 주세요.";
      setLastError(msg);
      onToast?.(msg, "error");
    } finally {
      setSending(false);
    }
  }, [
    phone,
    onToast,
    senderLabel,
    purpose,
    phoneTaken,
    phoneCheckMsg,
    excludeUserId,
    onAvailabilityChange,
  ]);

  const verifyOtp = useCallback(async () => {
    if (!otpSent && !devHint) {
      onToast?.("먼저 「인증번호 받기」를 눌러 주세요.", "error");
      return;
    }
    setVerifying(true);
    setLastError(null);
    try {
      const res = await fetch("/api/auth/sms/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(),
          code,
          purpose,
          excludeUserId: excludeUserId || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        const msg = data.userMessage || "인증번호가 맞지 않습니다.";
        if (data.code === "PHONE_TAKEN" || res.status === 409) {
          setPhoneTaken(true);
          setPhoneCheckMsg(msg);
          onAvailabilityChange?.({
            registered: true,
            message: msg,
            checking: false,
          });
        }
        setLastError(msg);
        onToast?.(msg, "error");
        return;
      }
      setVerified(true);
      setVerificationId(data.verificationId);
      onVerified?.({
        verificationId: data.verificationId,
        phone: data.phone || phone,
      });
      onToast?.(data.userMessage || "휴대폰 인증 완료", "success");
    } catch {
      const msg = "인증 확인에 실패했습니다.";
      setLastError(msg);
      onToast?.(msg, "error");
    } finally {
      setVerifying(false);
    }
  }, [
    phone,
    code,
    otpSent,
    devHint,
    onVerified,
    onToast,
    purpose,
    excludeUserId,
    onAvailabilityChange,
  ]);

  const phoneBorder = verified
    ? "border-[#03C75A]"
    : purpose === "signup" && phoneTaken
      ? "border-[#E42939]"
      : "";

  const canResend = !verified && !sending && resendCooldown <= 0;

  return (
    <div className="space-y-2">
      <label className="block text-[13px] font-semibold text-[#191F28] sm:text-[11px]">
        휴대폰 번호 {purpose === "signup" ? "*" : ""}
      </label>
      <p className="text-[12px] leading-relaxed text-[#4E5968] sm:text-[11px]">
        인증 문자는 <strong className="text-[#4E5968]">브릭로그 회사 발신번호</strong>
        ({senderLabel})에서 보냅니다. <strong className="text-[#4E5968]">본인 휴대폰</strong>
        으로 수신되는 것은 가입 본인 확인용이며, 다른 회원에게 공개되지 않습니다.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="tel"
          required={purpose === "signup"}
          autoComplete="tel"
          aria-label="휴대폰 번호"
          disabled={disabled || verified}
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          placeholder="010-1234-5678"
          className={`min-w-0 flex-1 ${fieldClass} ${phoneBorder}`}
        />
        <button
          type="button"
          disabled={
            disabled ||
            verified ||
            sending ||
            !canResend ||
            (purpose === "signup" && (phoneTaken || phoneChecking))
          }
          onClick={sendOtp}
          className={`min-h-[48px] shrink-0 sm:min-h-0 sm:min-w-[8.5rem] ${GREEN_CTA_OUTLINE} py-3! text-[13px]! sm:py-2.5! sm:text-[12px]!`}
        >
          {sending
            ? "발송 중…"
            : verified
              ? "완료"
              : otpSent && resendCooldown > 0
                ? `다시 받기 ${resendCooldown}초`
                : otpSent
                  ? "인증번호 다시 받기"
                  : "인증번호 받기"}
        </button>
      </div>

      {otpSent && !verified && !devHint && (
        <p className="rounded-lg border border-[#03C75A]/25 bg-[#F0FFF5] px-2.5 py-2 text-[11px] leading-relaxed text-[#03A94D]">
          <strong className="text-[#191F28]">{senderLabel}</strong> 번호로 온 6자리
          인증번호를 아래에 입력한 뒤 「인증 확인」을 눌러 주세요. (유효 5분)
        </p>
      )}

      {!verified ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            aria-label="인증번호 6자리"
            disabled={disabled || verifying}
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="문자로 받은 6자리"
            className={`min-w-0 flex-1 ${fieldClass}`}
          />
          <button
            type="button"
            disabled={disabled || verifying || code.length !== 6}
            onClick={verifyOtp}
            className="min-h-[48px] shrink-0 rounded-xl bg-[#03C75A] px-4 py-3 text-[13px] font-semibold text-white hover:bg-[#02B350] disabled:opacity-50 sm:min-h-0 sm:min-w-[7.5rem] sm:py-2.5 sm:text-[12px]"
          >
            {verifying ? "확인 중…" : "인증 확인"}
          </button>
        </div>
      ) : (
        <p className="text-[11px] font-semibold text-[#03A94D]" role="status">
          휴대폰 인증 완료 ({maskPhone(phone)})
        </p>
      )}

      {devHint ? (
        <p className="rounded-lg border border-[#E8F0FF] bg-[#F7FAFF] px-2.5 py-2 text-[11px] leading-relaxed text-[#4E5968]">
          <span className="font-semibold text-[#03A94D]">개발 모드</span> — 실제
          문자는 오지 않습니다. 아래 번호를 「인증번호」 칸에 입력하세요.
          <span className="mt-1 block font-mono text-[12px] text-[#191F28]">
            {devHint.replace(/^개발 모드 인증번호:\s*/i, "")}
          </span>
        </p>
      ) : null}

      {purpose === "signup" && phoneCheckMsg ? (
        <p
          className={`text-[11px] ${
            phoneTaken ? "text-[#E42939]" : "text-[#03A94D]"
          }`}
          role="status"
        >
          {phoneChecking ? "휴대폰 번호 확인 중…" : phoneCheckMsg}
        </p>
      ) : null}

      {lastError ? (
        <p className="text-[11px] text-[#E67700]" role="alert">
          {lastError}
        </p>
      ) : null}

      <p className="text-[11px] leading-relaxed text-[#8B95A1]">
        {purpose === "signup" ? (
          <>
            운영자 개인 번호가 아닌 <strong className="font-medium text-[#4E5968]">서비스 등록 발신번호</strong>
            로만 발송합니다.{" "}
            <Link
              href={LEGAL_LINKS.privacy}
              target="_blank"
              className="font-medium text-[#03A94D] hover:underline"
            >
              개인정보처리방침
            </Link>
          </>
        ) : (
          "휴대폰 번호는 인증 목적으로만 사용합니다."
        )}
      </p>
    </div>
  );
}
