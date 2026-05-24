"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { validateNickname } from "@/lib/auth/signupProfile";

const fieldClass =
  "w-full rounded-xl border border-[#E8EBED] bg-[#FAFBFC] px-3.5 py-2.5 text-[14px] outline-none focus:border-[#03C75A]";

/**
 * @param {{
 *   values: Record<string, string>,
 *   onChange: (field: string, value: string) => void,
 *   disabled?: boolean,
 *   excludeUserId?: string | null,
 * }} props
 */
export default function SignupProfileFields({
  values,
  onChange,
  disabled = false,
  excludeUserId = null,
}) {
  const [nicknameStatus, setNicknameStatus] = useState("idle");
  const [nicknameMessage, setNicknameMessage] = useState("");
  const debounceRef = useRef(null);

  const checkNickname = useCallback(
    async (raw) => {
      const check = validateNickname(raw);
      if (!check.ok) {
        setNicknameStatus("invalid");
        setNicknameMessage(check.message);
        return false;
      }

      setNicknameStatus("checking");
      setNicknameMessage("확인 중…");
      try {
        const q = new URLSearchParams({ nickname: check.value });
        if (excludeUserId) q.set("excludeUserId", excludeUserId);
        const res = await fetch(`/api/auth/check-nickname?${q}`);
        const data = await res.json();
        if (!data.ok) {
          setNicknameStatus("error");
          setNicknameMessage(data.userMessage || "닉네임을 확인하지 못했습니다.");
          return false;
        }
        if (!data.valid || !data.available) {
          setNicknameStatus("taken");
          setNicknameMessage(
            data.userMessage ||
              "이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해 주세요."
          );
          return false;
        }
        setNicknameStatus("available");
        setNicknameMessage("사용 가능한 닉네임입니다.");
        return true;
      } catch {
        setNicknameStatus("error");
        setNicknameMessage("닉네임을 확인하지 못했습니다.");
        return false;
      }
    },
    [excludeUserId]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const nick = values.nickname?.trim();
    if (!nick) {
      setNicknameStatus("idle");
      setNicknameMessage("");
      return undefined;
    }
    debounceRef.current = setTimeout(() => {
      checkNickname(nick);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [values.nickname, checkNickname]);

  const nicknameBorder =
    nicknameStatus === "available"
      ? "border-[#03C75A]"
      : nicknameStatus === "taken" || nicknameStatus === "invalid"
        ? "border-[#E42939]"
        : "border-[#E8EBED]";

  return (
    <div className="space-y-2.5 rounded-xl border border-[#E8EBED]/80 bg-[#FAFBFC]/60 p-3">
      <p className="text-[11px] font-semibold text-[#4E5968]">
        프로필 (맞춤 안내용)
      </p>

      <div>
        <input
          type="text"
          required
          autoComplete="nickname"
          aria-label="희망 닉네임"
          disabled={disabled}
          value={values.nickname}
          onChange={(e) => onChange("nickname", e.target.value)}
          onBlur={() => values.nickname?.trim() && checkNickname(values.nickname)}
          placeholder="희망 닉네임 (환영 인사에 사용)"
          className={`${fieldClass} ${nicknameBorder}`}
        />
        {nicknameMessage ? (
          <p
            className={`mt-1 text-[11px] ${
              nicknameStatus === "available"
                ? "text-[#03A94D]"
                : nicknameStatus === "idle"
                  ? "text-[#8B95A1]"
                  : "text-[#E42939]"
            }`}
          >
            {nicknameMessage}
          </p>
        ) : (
          <p className="mt-1 text-[11px] text-[#8B95A1]">
            로그인 후 「○○○ 디렉터님」으로 불러 드려요.
          </p>
        )}
      </div>

      <input
        type="text"
        required
        autoComplete="name"
        aria-label="이름"
        disabled={disabled}
        value={values.fullName}
        onChange={(e) => onChange("fullName", e.target.value)}
        placeholder="이름"
        className={fieldClass}
      />

      <input
        type="tel"
        autoComplete="tel"
        aria-label="연락처"
        disabled={disabled}
        value={values.contactPhone}
        onChange={(e) => onChange("contactPhone", e.target.value)}
        placeholder="연락처 (선택, 예: 010-1234-5678)"
        className={fieldClass}
      />

      <input
        type="text"
        required
        aria-label="브랜드 또는 사업자명"
        disabled={disabled}
        value={values.businessName}
        onChange={(e) => onChange("businessName", e.target.value)}
        placeholder="브랜드 / 사업자명"
        className={fieldClass}
      />

      <input
        type="text"
        required
        aria-label="직책"
        disabled={disabled}
        value={values.jobTitle}
        onChange={(e) => onChange("jobTitle", e.target.value)}
        placeholder="직책"
        className={fieldClass}
      />

      <input
        type="number"
        required
        min={1}
        max={99}
        aria-label="사용하고자 하는 브랜드 수"
        disabled={disabled}
        value={values.intendedBrandCount}
        onChange={(e) => onChange("intendedBrandCount", e.target.value)}
        placeholder="사용 브랜드 수 (1~99)"
        className={fieldClass}
      />
    </div>
  );
}

export { validateNickname };
