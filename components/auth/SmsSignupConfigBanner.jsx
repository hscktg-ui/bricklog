"use client";

import { useEffect, useState } from "react";
import { AUTH_WARN_SURFACE_CLASS } from "@/lib/ui/authFieldStyles";
import { getPublicSmsSenderLabel } from "@/lib/sms/smsDisplay";

/**
 * SMS 미설정·DB 미준비 시 가입 경로 안내 (P2 — DESIGN_JOBS_AUDIT)
 * @param {{ phoneRequired: boolean }} props
 */
export default function SmsSignupConfigBanner({ phoneRequired }) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!phoneRequired) return;
    let cancelled = false;
    fetch("/api/auth/sms/status")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        if (!cancelled) setStatus({ ok: false, message: "문자 상태를 확인하지 못했습니다." });
      });
    return () => {
      cancelled = true;
    };
  }, [phoneRequired]);

  if (!phoneRequired || !status || status.ok) return null;

  const sender = getPublicSmsSenderLabel();
  const devHint = status.devMode
    ? "개발 모드(BRICLOG_SMS_DEV_MODE)에서는 콘솔 OTP로 인증할 수 있어요."
    : null;

  return (
    <div className={`mt-3 ${AUTH_WARN_SURFACE_CLASS}`} role="status">
      <p className="text-[13px] font-semibold text-[var(--vision-ink,#0f1a14)]">
        문자 가입 준비가 아직 끝나지 않았어요
      </p>
      <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--vision-muted,#5a6b62)]">
        {status.message ||
          "문자 발송(Solapi) 또는 인증 DB 설정이 필요합니다. 설정이 완료되면 「브릭로그」 문자({sender})로 가입 확인을 받을 수 있어요."}
      </p>
      {devHint ? (
        <p className="mt-2 text-[11px] leading-relaxed text-[#4E5968]">{devHint}</p>
      ) : null}
    </div>
  );
}
