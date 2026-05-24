"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { checkNicknameAvailability } from "@/lib/auth/checkNicknameClient";
import { PREFERRED_TITLES } from "@/lib/auth/profileOptions";

const fieldClass =
  "w-full rounded-xl border border-[#E8EBED] bg-[#FAFBFC] px-3.5 py-2.5 text-[14px] outline-none focus:border-[#03C75A]";
const selectClass = `${fieldClass} appearance-none`;

/**
 * @param {{
 *   values: Record<string, string>,
 *   onChange: (field: string, value: string) => void,
 *   disabled?: boolean,
 *   excludeUserId?: string | null,
 *   onNicknameAvailability?: (available: boolean, status: string) => void,
 * }} props
 */
export default function ProfileSetupFields({
  values,
  onChange,
  disabled = false,
  excludeUserId = null,
  onNicknameAvailability,
}) {
  const [nicknameStatus, setNicknameStatus] = useState("idle");
  const [nicknameMessage, setNicknameMessage] = useState("");
  const [nicknameChecking, setNicknameChecking] = useState(false);
  const debounceRef = useRef(null);
  const checkGenRef = useRef(0);

  const applyNicknameResult = useCallback(
    (result) => {
      setNicknameStatus(result.status);
      setNicknameMessage(result.message);
      onNicknameAvailability?.(result.available, result.status);
      return result.available;
    },
    [onNicknameAvailability]
  );

  const runNicknameCheck = useCallback(
    async (raw, { immediate = false } = {}) => {
      const nick = String(raw ?? "").trim();
      if (!nick) {
        setNicknameStatus("idle");
        setNicknameMessage("");
        onNicknameAvailability?.(false, "idle");
        return false;
      }

      const gen = checkGenRef.current + 1;
      checkGenRef.current = gen;
      setNicknameChecking(true);
      if (immediate) {
        setNicknameStatus("checking");
        setNicknameMessage("확인 중…");
      }

      const result = await checkNicknameAvailability(nick, { excludeUserId });
      if (gen !== checkGenRef.current) return false;

      setNicknameChecking(false);
      return applyNicknameResult(result);
    },
    [excludeUserId, applyNicknameResult, onNicknameAvailability]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const nick = values.nickname?.trim();
    if (!nick) {
      setNicknameStatus("idle");
      setNicknameMessage("");
      onNicknameAvailability?.(false, "idle");
      return undefined;
    }
    debounceRef.current = setTimeout(
      () => runNicknameCheck(nick, { immediate: true }),
      450
    );
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [values.nickname, runNicknameCheck, onNicknameAvailability]);

  const nicknameBorder =
    nicknameStatus === "available" || nicknameStatus === "deferred"
      ? nicknameStatus === "deferred"
        ? "border-[#E8EBED]"
        : "border-[#03C75A]"
      : nicknameStatus === "taken" || nicknameStatus === "invalid"
        ? "border-[#E42939]"
        : "border-[#E8EBED]";

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold text-[#4E5968]">프로필</p>
      <p className="text-[11px] leading-relaxed text-[#8B95A1]">
        닉네임과 호칭은 화면 인사에만 씁니다. 글 본문에는 넣지 않습니다.
      </p>

      <div>
        <label className="mb-1 block text-[11px] font-medium text-[#4E5968]">
          닉네임 *
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            required
            autoComplete="nickname"
            aria-label="닉네임"
            disabled={disabled}
            value={values.nickname}
            onChange={(e) => onChange("nickname", e.target.value)}
            onBlur={() =>
              values.nickname?.trim() &&
              runNicknameCheck(values.nickname, { immediate: true })
            }
            placeholder="불러드릴 이름"
            className={`min-w-0 flex-1 ${fieldClass} ${nicknameBorder}`}
          />
          <button
            type="button"
            disabled={disabled || nicknameChecking || !values.nickname?.trim()}
            onClick={() =>
              runNicknameCheck(values.nickname, { immediate: true })
            }
            className="shrink-0 rounded-xl border border-[#03C75A]/40 bg-white px-3 py-2.5 text-[12px] font-semibold text-[#03A94D] hover:bg-[#F0FFF5] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {nicknameChecking ? "확인 중…" : "중복 확인"}
          </button>
        </div>
        {nicknameMessage ? (
          <p
            className={`mt-1 text-[11px] ${
              nicknameStatus === "available"
                ? "text-[#03A94D]"
                : nicknameStatus === "deferred"
                  ? "text-[#E67700]"
                  : nicknameStatus === "taken" || nicknameStatus === "invalid"
                    ? "text-[#E42939]"
                    : "text-[#8B95A1]"
            }`}
            role="status"
          >
            {nicknameMessage}
          </p>
        ) : (
          <p className="mt-1 text-[11px] text-[#8B95A1]">
            한글·영문·숫자·_ · 2~20자
          </p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-medium text-[#4E5968]">
          호칭 *
        </label>
        <select
          required
          aria-label="호칭"
          disabled={disabled}
          value={values.preferredTitle || "디렉터님"}
          onChange={(e) => onChange("preferredTitle", e.target.value)}
          className={selectClass}
        >
          {PREFERRED_TITLES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        {values.preferredTitle === "custom" ? (
          <input
            type="text"
            required
            aria-label="호칭 직접 입력"
            disabled={disabled}
            value={values.customTitle}
            onChange={(e) => onChange("customTitle", e.target.value)}
            placeholder="예: 팀장님"
            className={`${fieldClass} mt-2`}
          />
        ) : null}
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-medium text-[#4E5968]">
          연락처 (선택)
        </label>
        <input
          type="tel"
          autoComplete="tel"
          aria-label="연락처"
          disabled={disabled}
          value={values.contactPhone}
          onChange={(e) => onChange("contactPhone", e.target.value)}
          placeholder="010-1234-5678"
          className={fieldClass}
        />
      </div>
    </div>
  );
}
