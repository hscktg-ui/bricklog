"use client";

import { useState } from "react";
import Link from "next/link";
import { fetchWithAuth } from "@/lib/api/clientAuth";
import { LEGAL_LINKS } from "@/lib/auth/legalVersions";
import Logo from "@/components/Logo";

export default function TermsConsentModal({ onComplete, onToast }) {
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [marketingAgreed, setMarketingAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!termsAgreed || !privacyAgreed) {
      onToast?.("필수 약관에 동의해 주세요.", "error");
      return;
    }

    setLoading(true);
    try {
      await fetchWithAuth("/api/auth/terms", {
        method: "POST",
        body: JSON.stringify({
          termsAgreed: true,
          privacyAgreed: true,
          marketingAgreed,
        }),
      });
      onToast?.("약관 동의가 완료되었습니다.", "success");
      onComplete?.();
    } catch (err) {
      onToast?.(err.message || "약관 동의 저장에 실패했습니다.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[250] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-consent-title"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        aria-hidden
      />
      <div className="pointer-events-auto relative z-10 w-full max-w-md rounded-2xl border border-[#E8EBED] bg-white p-8 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
        <div className="mb-6 flex justify-center">
          <Logo iconSize={32} />
        </div>
        <h2
          id="terms-consent-title"
          className="text-center text-xl font-bold text-[#191F28]"
        >
          서비스 이용 동의
        </h2>
        <p className="mt-2 text-center text-[13px] text-[#8B95A1]">
          BRICLOG 이용을 위해 아래 약관에 동의해 주세요.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="flex cursor-pointer items-start gap-3 text-[13px] text-[#4E5968]">
            <input
              type="checkbox"
              required
              checked={termsAgreed}
              onChange={(e) => setTermsAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#E8EBED] text-[#03C75A]"
            />
            <span>
              <Link
                href={LEGAL_LINKS.terms}
                target="_blank"
                className="font-semibold text-[#03A94D] hover:underline"
              >
                이용약관
              </Link>
              에 동의합니다 (필수)
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 text-[13px] text-[#4E5968]">
            <input
              type="checkbox"
              required
              checked={privacyAgreed}
              onChange={(e) => setPrivacyAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#E8EBED] text-[#03C75A]"
            />
            <span>
              <Link
                href={LEGAL_LINKS.privacy}
                target="_blank"
                className="font-semibold text-[#03A94D] hover:underline"
              >
                개인정보처리방침
              </Link>
              에 동의합니다 (필수)
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 text-[13px] text-[#4E5968]">
            <input
              type="checkbox"
              checked={marketingAgreed}
              onChange={(e) => setMarketingAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#E8EBED] text-[#03C75A]"
            />
            <span>마케팅 정보 수신에 동의합니다 (선택)</span>
          </label>

          <button
            type="submit"
            disabled={loading || !termsAgreed || !privacyAgreed}
            className="w-full rounded-xl bg-[#03C75A] py-3.5 text-[15px] font-bold text-white disabled:opacity-60"
          >
            {loading ? "저장 중…" : "동의하고 시작하기"}
          </button>
        </form>
      </div>
    </div>
  );
}
