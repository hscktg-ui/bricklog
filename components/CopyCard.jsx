"use client";

import { useState } from "react";
import Icon from "./Icon";
import { VISION_WORKSPACE_PANEL } from "@/lib/landing/vision2030Styles";

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
      ? "border-[rgba(48,209,88,0.18)] bg-[rgba(48,209,88,0.08)]"
      : variant === "muted"
        ? "border-[var(--vision-line)] bg-[var(--vision-paper)]"
        : "border-[var(--vision-line)] bg-white";

  return (
    <div className={`${VISION_WORKSPACE_PANEL} p-4 ${bg}`}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-[12px] font-semibold text-[var(--vision-muted)]">
            {label}
          </p>
          {hint ? (
            <p className="mt-0.5 text-[11px] text-[var(--vision-muted)]">{hint}</p>
          ) : null}
        </div>
        {text ? (
          <button
            type="button"
            onClick={handleCopy}
            className="flex shrink-0 items-center gap-1 rounded-full border border-[var(--vision-line-strong)] bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--vision-ink)] shadow-[var(--vision-shadow-soft)] hover:border-[rgba(48,209,88,0.35)] hover:bg-[rgba(48,209,88,0.08)]"
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
            variant === "cta"
              ? "font-medium text-[var(--vision-accent)]"
              : "text-[var(--vision-ink)]"
          }`}
        >
          {text}
        </p>
      )}
    </div>
  );
}
