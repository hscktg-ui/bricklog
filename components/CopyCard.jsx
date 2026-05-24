"use client";

import { useState } from "react";
import Icon from "./Icon";

export default function CopyCard({
  label,
  value,
  hint,
  variant = "default",
  children,
}) {
  const [copied, setCopied] = useState(false);
  const text = value ?? (typeof children === "string" ? children : "");

  const handleCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const bg =
    variant === "cta"
      ? "bg-[#E8F9EF] border-[#03C75A]/20"
      : variant === "muted"
        ? "bg-[#FAFBFC]"
        : "bg-white";

  return (
    <div className={`rounded-xl border border-[#E8EBED] p-4 ${bg}`}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-[12px] font-bold text-[#4E5968]">{label}</p>
          {hint && (
            <p className="mt-0.5 text-[11px] text-[#8B95A1]">{hint}</p>
          )}
        </div>
        {text ? (
          <button
            type="button"
            onClick={handleCopy}
            className="flex shrink-0 items-center gap-1 rounded-lg border border-[#E8EBED] bg-white px-2 py-1 text-[11px] font-semibold text-[#03A94D] hover:bg-[#E8F9EF]"
          >
            <Icon name="copy" className="h-3.5 w-3.5" />
            {copied ? "복사 완료" : "복사하기"}
          </button>
        ) : null}
      </div>
      {children && !text ? (
        children
      ) : (
        <p
          className={`whitespace-pre-wrap text-[13px] leading-relaxed ${
            variant === "cta" ? "font-medium text-[#03A94D]" : "text-[#191F28]"
          }`}
        >
          {text}
        </p>
      )}
    </div>
  );
}
