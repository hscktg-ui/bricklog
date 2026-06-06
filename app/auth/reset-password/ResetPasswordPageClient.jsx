"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import {
  establishRecoverySessionFromUrl,
  recoveryLinkErrorMessage,
} from "@/lib/auth/recoveryFromUrl";
import { mapAuthError } from "@/lib/auth/messages";
import PasswordField from "@/components/auth/PasswordField";
import Logo from "@/components/Logo";
import RecoveryHashBootstrap from "./RecoveryHashBootstrap";
import {
  AUTH_MOBILE_PAGE_CLASS,
  AUTH_MOBILE_SHELL_CLASS,
  AUTH_PRIMARY_BTN_CLASS,
  AUTH_SURFACE_CLASS,
} from "@/lib/ui/authFieldStyles";

const STEPS = {
  loading: "loading",
  form: "form",
  error: "error",
};

export default function ResetPasswordPageClient() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState(STEPS.loading);
  const [message, setMessage] = useState("비밀번호 재설정을 준비하는 중…");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const bootstrapRecovery = useCallback(async () => {
    const presetError = recoveryLinkErrorMessage(searchParams);
    if (presetError) {
      setMessage(presetError);
      setStep(STEPS.error);
      return;
    }

    const result = await establishRecoverySessionFromUrl();
    if (result.ok) {
      setStep(STEPS.form);
      setMessage("");
      if (window.location.search || window.location.hash) {
        const url = new URL(window.location.href);
        url.search = "";
        url.hash = "";
        window.history.replaceState({}, "", url.pathname);
      }
      return;
    }

    const { data } = await supabase.auth.getSession();
    if (data?.session) {
      setStep(STEPS.form);
      setMessage("");
      return;
    }

    setMessage(
      mapAuthError(result.reason) ||
        "재설정 링크가 만료되었거나 이미 사용되었습니다. 비밀번호 찾기를 다시 요청해 주세요."
    );
    setStep(STEPS.error);
  }, [searchParams]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setMessage("로그인 설정이 완료되지 않았습니다.");
      setStep(STEPS.error);
      return undefined;
    }

    let cancelled = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY" && session) {
        setStep(STEPS.form);
        setMessage("");
      }
    });

    void bootstrapRecovery();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [bootstrapRecovery]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      setMessage("비밀번호는 6자 이상으로 설정해 주세요.");
      return;
    }
    if (password !== confirm) {
      setMessage("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setSubmitting(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !sessionData?.session) {
        throw new Error("비밀번호는 저장됐지만 로그인 세션을 유지하지 못했습니다.");
      }

      try {
        await fetch("/api/auth/profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        });
      } catch {
        /* 프로필 갱신 실패해도 로그인은 유지 */
      }

      window.location.assign("/?reset=ok");
    } catch (err) {
      setMessage(mapAuthError(err?.message || "비밀번호를 저장하지 못했습니다."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={AUTH_MOBILE_PAGE_CLASS}>
      <RecoveryHashBootstrap />
      <div className={`${AUTH_MOBILE_SHELL_CLASS} ${AUTH_SURFACE_CLASS}`}>
        <div className="mb-5 flex justify-center">
          <Logo />
        </div>

        {step === STEPS.loading ? (
          <p className="text-center text-[14px] text-[#8B95A1]">{message}</p>
        ) : null}

        {step === STEPS.error ? (
          <div className="space-y-4 text-center text-[14px] leading-relaxed text-[#4E5968]">
            <p>{message}</p>
            <p className="text-[13px] text-[#8B95A1]">
              예전 메일 링크는 한 번만 쓸 수 있습니다. 아래에서{" "}
              <strong>새 비밀번호 찾기</strong>를 요청해 주세요.
            </p>
            <Link
              href="/?auth=login"
              className="inline-block font-semibold text-[#03A94D] hover:underline"
            >
              로그인 화면에서 비밀번호 찾기 →
            </Link>
          </div>
        ) : null}

        {step === STEPS.form ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h1 className="text-center text-[18px] font-bold text-[#191F28]">
              새 비밀번호 설정
            </h1>
            <p className="text-center text-[13px] leading-relaxed text-[#8B95A1]">
              저장하면 자동으로 로그인된 상태로 작업실로 이동합니다.
            </p>
            <div>
              <label
                htmlFor="new-password"
                className="mb-1.5 block text-[13px] font-medium text-[#4E5968]"
              >
                새 비밀번호
              </label>
              <PasswordField
                id="new-password"
                value={password}
                onChange={setPassword}
                placeholder="6자 이상"
                autoComplete="new-password"
                minLength={6}
                disabled={submitting}
                aria-label="새 비밀번호"
              />
            </div>
            <div>
              <label
                htmlFor="confirm-password"
                className="mb-1.5 block text-[13px] font-medium text-[#4E5968]"
              >
                비밀번호 확인
              </label>
              <PasswordField
                id="confirm-password"
                value={confirm}
                onChange={setConfirm}
                placeholder="다시 입력"
                autoComplete="new-password"
                minLength={6}
                disabled={submitting}
                aria-label="비밀번호 확인"
              />
            </div>
            {message ? (
              <p className="text-center text-[13px] text-[#E42939]" role="alert">
                {message}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={submitting}
              className={AUTH_PRIMARY_BTN_CLASS}
            >
              {submitting ? "저장 중…" : "비밀번호 저장하고 시작하기"}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
