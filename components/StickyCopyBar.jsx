"use client";

import Icon from "@/components/Icon";
import { VISION_CTA_ACCENT } from "@/lib/landing/vision2030Styles";

/** Mobile/tablet sticky CTA — copy-ready body text */
export default function StickyCopyBar({
  onCopy,
  label = "복사하기",
  disabled = false,
}) {
  if (disabled) return null;

  return (
    <div className="fixed bottom-[calc(var(--workspace-mobile-nav-h)+env(safe-area-inset-bottom,0px)+0.75rem)] left-1/2 z-20 w-[min(100%-2rem,32rem)] -translate-x-1/2 lg:hidden">
      <button
        type="button"
        onClick={onCopy}
        className={`${VISION_CTA_ACCENT} !min-h-[52px] !w-full !shadow-[0_12px_40px_rgba(48,209,88,0.28)]`}
      >
        <span className="inline-flex items-center justify-center gap-2 text-[15px] font-semibold">
          <Icon name="copy" className="h-5 w-5" />
          <span>{label}</span>
        </span>
      </button>
    </div>
  );
}
