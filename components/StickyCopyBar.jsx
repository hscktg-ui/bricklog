"use client";

import Icon from "@/components/Icon";

/** Mobile/tablet sticky CTA — copy-ready body text */
export default function StickyCopyBar({
  onCopy,
  label = "복사하기",
  disabled = false,
}) {
  if (disabled) return null;

  return (
    <div
      className="fixed bottom-[calc(var(--workspace-mobile-nav-h)+env(safe-area-inset-bottom,0px)+0.75rem)] left-1/2 z-20 w-[min(100%-2rem,32rem)] -translate-x-1/2 lg:hidden"
    >
      <button
        type="button"
        onClick={onCopy}
        className="briclog-btn-primary !shadow-[0_-4px_24px_rgba(0,0,0,0.12)]"
      >
        <span className="inline-flex items-center justify-center gap-2 text-[15px] font-semibold">
          <Icon name="copy" className="h-5 w-5" />
          <span>{label}</span>
        </span>
      </button>
    </div>
  );
}
