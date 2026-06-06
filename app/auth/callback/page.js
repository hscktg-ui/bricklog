"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { mapAuthError } from "@/lib/auth/messages";
import {
  establishRecoverySessionFromUrl,
  isRecoveryRedirectUrl,
} from "@/lib/auth/recoveryFromUrl";

function callbackErrorMessage(params) {
  const desc = params.get("error_description") || params.get("error");
  if (!desc) return null;
  return mapAuthError(decodeURIComponent(desc.replace(/\+/g, " ")));
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("로그인을 완료하는 중…");

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setMessage("로그인 설정이 완료되지 않았습니다.");
      router.replace("/?error=" + encodeURIComponent("로그인 설정이 완료되지 않았습니다."));
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const errorCode = params.get("error_code");
        if (errorCode === "otp_expired" || params.get("type") === "recovery") {
          if (!cancelled) {
            const q = params.toString();
            router.replace(
              `/auth/reset-password${q ? `?${q}` : "?error=expired"}`
            );
          }
          return;
        }

        const oauthErr = callbackErrorMessage(params);
        if (oauthErr) throw new Error(oauthErr);

        const code = params.get("code");
        const hash = window.location.hash?.startsWith("#")
          ? window.location.hash.slice(1)
          : "";
        const hashParams = hash ? new URLSearchParams(hash) : null;
        const hashErr = hashParams ? callbackErrorMessage(hashParams) : null;
        if (hashErr) throw new Error(hashErr);

        if (isRecoveryRedirectUrl()) {
          const recovery = await establishRecoverySessionFromUrl();
          if (!recovery.ok) {
            throw new Error(recovery.reason || "로그인 세션을 만들지 못했습니다.");
          }
          if (!cancelled) {
            router.replace("/auth/reset-password");
            router.refresh();
          }
          return;
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          const recovery = await establishRecoverySessionFromUrl();
          if (recovery.ok) {
            if (!cancelled) {
              router.replace("/auth/reset-password");
              router.refresh();
            }
            return;
          }
          const { data, error } = await supabase.auth.getSession();
          if (error) throw error;
          if (!data.session) {
            throw new Error("로그인 세션을 만들지 못했습니다.");
          }
        }

        if (!cancelled) {
          router.replace("/");
          router.refresh();
        }
      } catch (err) {
        const text = mapAuthError(err?.message || "로그인에 실패했습니다.");
        if (!cancelled) {
          setMessage(text);
          router.replace("/?error=" + encodeURIComponent(text));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#F7F8FA] px-4 text-[14px] text-[#8B95A1]">
      {message}
    </div>
  );
}
