"use client";

import Icon from "@/components/Icon";
import { VISION_COPY_BTN } from "@/lib/landing/vision2030Styles";

export default function FullCopyButton({ text, onCopy, disabled, label = "전체 복사하기" }) {
  if (!text) return null;

  return (
    <button
      type="button"
      disabled={disabled || !text}
      onClick={() => onCopy?.(text)}
      className={VISION_COPY_BTN}
    >
      <span className="inline-flex items-center gap-1.5">
        <Icon name="copy" className="h-4 w-4" />
        <span>{label}</span>
      </span>
    </button>
  );
}
