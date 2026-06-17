"use client";

import { BLOG_GENERATE_CTA } from "@/lib/product/blogCtaCopy";
import {
  resolveBlogGenHintFooter,
  resolveBlogGenHintStatusClass,
  resolveBlogHintPanelTitle,
} from "@/lib/product/customerOutput";
import {
  VISION_CTA_ACCENT,
  VISION_HINT_PANEL,
  VISION_STATUS_NEUTRAL,
  VISION_STATUS_OK,
  VISION_STATUS_WARN,
} from "@/lib/landing/vision2030Styles";

const STATUS_CLASS = {
  ok: VISION_STATUS_OK,
  warn: VISION_STATUS_WARN,
  neutral: VISION_STATUS_NEUTRAL,
};

/**
 * 블로그 생성 실패·보류 안내 — PC·태블릿·모바일 공통
 */
export default function BlogGenHintPanel({
  hint,
  soft = false,
  isAuth = false,
  isMobile = false,
  isTablet = false,
  compact = false,
  onRetry = null,
  className = "",
}) {
  if (!hint) return null;

  const tone = resolveBlogGenHintStatusClass(hint, soft);
  const footer = !isAuth ? resolveBlogGenHintFooter(hint, { isMobile, isTablet }) : null;
  const showRetry =
    typeof onRetry === "function" &&
    !isAuth &&
    /준비되지 않|올리지 못|다시 눌러|끊겼/.test(hint);

  return (
    <div
      className={`${VISION_HINT_PANEL} ${STATUS_CLASS[tone] || VISION_STATUS_NEUTRAL} ${className}`}
      role="status"
      aria-live="polite"
    >
      <p
        className={`font-semibold text-[var(--vision-ink)] ${
          compact ? "text-[13px]" : "text-[14px] sm:text-[15px]"
        }`}
      >
        {resolveBlogHintPanelTitle(hint, soft)}
      </p>
      <p
        className={`mt-2 leading-relaxed text-[var(--vision-muted)] ${
          compact ? "text-[12px]" : "text-[13px] sm:text-[14px]"
        }`}
      >
        {hint}
      </p>
      {footer ? (
        <p className="mt-3 text-[12px] leading-relaxed text-[var(--vision-muted)]">
          {footer}
        </p>
      ) : null}
      {showRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className={`${VISION_CTA_ACCENT} mt-4 !min-h-[48px] w-full sm:max-w-xs`}
        >
          {BLOG_GENERATE_CTA}
        </button>
      ) : null}
    </div>
  );
}
