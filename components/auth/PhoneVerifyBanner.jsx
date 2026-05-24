"use client";

import { useState } from "react";
import { fetchWithAuth } from "@/lib/api/clientAuth";
import PhoneSmsVerifyFields from "@/components/auth/PhoneSmsVerifyFields";

/**
 * @param {{ onToast?: (msg: string, type?: string) => void, onComplete?: () => void }} props
 */
export default function PhoneVerifyBanner({ onToast, onComplete }) {
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleVerified = async ({ verificationId }) => {
    setSubmitting(true);
    try {
      const data = await fetchWithAuth("/api/auth/profile/phone", {
        method: "POST",
        body: JSON.stringify({
          phoneVerificationId: verificationId,
          phone: phone.trim(),
        }),
      });
      onToast?.(data.userMessage || "휴대폰 인증 완료", "success");
      onComplete?.();
    } catch {
      onToast?.("휴대폰 인증 연결에 실패했습니다.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border-b border-[#03C75A]/25 bg-[#F0FFF5] px-4 py-4 sm:px-6">
      <p className="text-[13px] font-semibold text-[#191F28]">
        휴대폰 문자 인증이 필요합니다
      </p>
      <p className="mt-1 text-[12px] text-[#4E5968]">
        글 생성·브랜드 추가 전에 한 번만 인증해 주세요.
      </p>
      <div className="mt-3 max-w-md">
        <PhoneSmsVerifyFields
          phone={phone}
          onPhoneChange={setPhone}
          disabled={submitting}
          onToast={onToast}
          onVerified={handleVerified}
        />
      </div>
    </div>
  );
}
