"use client";

import { recordSignupIntent } from "@/lib/analytics/signupIntent";
import { getEnabledOAuthProviders } from "@/lib/auth/providers";
import { getAuthCallbackUrl } from "@/lib/auth/redirect";
import { mapAuthError } from "@/lib/auth/messages";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

export default function SocialAuthButtons({ onToast, disabled = false }) {
  const providers = getEnabledOAuthProviders();

  if (providers.length === 0) return null;

  const handleOAuth = async (providerId) => {
    recordSignupIntent(`oauth_${providerId}`);
    if (!isSupabaseConfigured) {
      onToast?.(
        "지금은 소셜 로그인을 이용할 수 없습니다. 잠시 후 다시 시도해 주세요.",
        "error"
      );
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: providerId,
        options: {
          redirectTo: getAuthCallbackUrl(),
          skipBrowserRedirect: false,
        },
      });
      if (error) throw error;
    } catch (err) {
      onToast?.(mapAuthError(err.message), "error");
    }
  };

  return (
    <div className="space-y-2.5">
      {providers.map(({ id, label, className }) => (
        <button
          key={id}
          type="button"
          disabled={disabled || !isSupabaseConfigured}
          onClick={() => handleOAuth(id)}
          className={`w-full min-h-[48px] rounded-full border px-4 py-2.5 text-[13px] font-semibold shadow-sm transition active:scale-[0.99] disabled:opacity-50 ${className}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
