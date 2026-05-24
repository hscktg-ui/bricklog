"use client";

import { supabase } from "@/lib/supabaseClient";
import { getAuthCallbackUrl } from "@/lib/auth/redirect";
import { mapAuthError } from "@/lib/auth/messages";
import { EMAIL_VERIFY } from "@/lib/product/craft";

/**
 * @param {{ email: string, onToast?: (msg: string, type?: string) => void }} props
 */
export default function EmailVerifyBanner({ email, onToast }) {
  const resend = async () => {
    if (!email?.trim()) {
      onToast?.("이메일을 확인할 수 없습니다.", "error");
      return;
    }
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: { emailRedirectTo: getAuthCallbackUrl() },
      });
      if (error) throw error;
      onToast?.("인증 메일을 다시 보냈습니다.", "success");
    } catch (err) {
      onToast?.(mapAuthError(err.message), "error");
    }
  };

  return (
    <div
      className="border-b border-[#03C75A]/25 bg-[#F0FFF5] px-4 py-3 text-center sm:px-6"
      role="status"
    >
      <p className="text-[13px] font-semibold text-[#191F28]">
        {EMAIL_VERIFY.title}
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-[#4E5968]">
        {EMAIL_VERIFY.body}
      </p>
      <button
        type="button"
        onClick={resend}
        className="briclog-btn-secondary mt-3 !min-h-[40px] !w-auto !px-4 !py-2 !text-[12px]"
      >
        {EMAIL_VERIFY.resend}
      </button>
    </div>
  );
}
