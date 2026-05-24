"use client";

import Icon from "@/components/Icon";

export default function FullCopyButton({ text, onCopy, disabled }) {
  if (!text) return null;

  return (
    <button
      type="button"
      disabled={disabled || !text}
      onClick={() => onCopy?.(text)}
      className="briclog-pressable relative flex items-center gap-1.5 rounded-lg border border-[#03C75A]/40 bg-[#E8F9EF] px-3 py-2 text-[13px] font-semibold text-[#03A94D] hover:bg-[#D4F5E4] disabled:opacity-50"
    >
      <span className="inline-flex items-center gap-1.5">
        <Icon name="copy" className="h-4 w-4" />
        <span>전체 복사하기</span>
      </span>
    </button>
  );
}
