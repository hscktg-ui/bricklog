"use client";

import { useCallback, useState } from "react";
import Icon from "@/components/Icon";

const inputClass =
  "w-full rounded-xl border border-[#E8EBED] bg-[#FAFBFC] py-2.5 pl-3.5 pr-12 text-[14px] outline-none focus:border-[#03C75A] focus:ring-2 focus:ring-[#03C75A]/15";

/**
 * @param {{
 *   value: string,
 *   onChange: (v: string) => void,
 *   placeholder?: string,
 *   autoComplete?: string,
 *   minLength?: number,
 *   disabled?: boolean,
 *   required?: boolean,
 *   "aria-label"?: string,
 * }} props
 */
export default function PasswordField({
  value,
  onChange,
  placeholder = "비밀번호",
  autoComplete = "current-password",
  minLength,
  disabled = false,
  required = true,
  "aria-label": ariaLabel = "비밀번호",
}) {
  const [visible, setVisible] = useState(false);
  const [capsOn, setCapsOn] = useState(false);

  const syncCaps = useCallback((e) => {
    if (typeof e.getModifierState === "function") {
      setCapsOn(e.getModifierState("CapsLock"));
    }
  }, []);

  return (
    <div>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          aria-label={ariaLabel}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={syncCaps}
          onKeyUp={syncCaps}
          onBlur={() => setCapsOn(false)}
          placeholder={placeholder}
          className={inputClass}
        />
        <button
          type="button"
          tabIndex={0}
          disabled={disabled}
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-[#8B95A1] hover:bg-[#F7F8FA] hover:text-[#191F28] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#03C75A]/25 disabled:opacity-50"
          aria-label={visible ? "비밀번호 숨기기" : "비밀번호 보기"}
          aria-pressed={visible}
        >
          <Icon name={visible ? "eyeOff" : "eye"} className="h-5 w-5" />
        </button>
      </div>
      {capsOn ? (
        <p
          className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-[#E67700]"
          role="status"
        >
          <span
            className="inline-flex h-4 min-w-[1.25rem] items-center justify-center rounded border border-[#E67700]/40 bg-[#FFF8F0] px-1 text-[9px] font-bold uppercase tracking-wide"
            aria-hidden
          >
            caps
          </span>
          Caps Lock이 켜져 있습니다
        </p>
      ) : null}
    </div>
  );
}
