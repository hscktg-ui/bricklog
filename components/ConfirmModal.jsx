"use client";

import { useEffect, useRef } from "react";
import Icon from "@/components/Icon";
import {
  VISION_CTA_ACCENT,
  VISION_GHOST_BTN,
  VISION_PANEL,
} from "@/lib/landing/vision2030Styles";

/**
 * @param {{
 *   open: boolean;
 *   title: string;
 *   message: string;
 *   confirmLabel?: string;
 *   cancelLabel?: string;
 *   variant?: "default" | "danger";
 *   onConfirm: () => void;
 *   onCancel: () => void;
 *   busy?: boolean;
 * }} props
 */
export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "확인",
  cancelLabel = "취소",
  variant = "default",
  onConfirm,
  onCancel,
  busy = false,
}) {
  const dialogRef = useRef(null);
  const cancelBtnRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    cancelBtnRef.current?.focus();
    const root = dialogRef.current;
    if (!root) return undefined;
    const onKey = (e) => {
      if (e.key !== "Tab") return;
      const focusable = root.querySelectorAll(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    root.addEventListener("keydown", onKey);
    return () => root.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  const confirmClass =
    variant === "danger"
      ? "relative inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full bg-[#E42939] px-4 text-[13px] font-semibold text-white transition hover:bg-[#C91F2E] disabled:opacity-50"
      : `${VISION_CTA_ACCENT} flex-1 !min-h-[44px] !text-[13px]`;

  return (
    <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        role="presentation"
        aria-hidden
        className="pointer-events-auto absolute inset-0 bg-black/40"
        onClick={busy ? undefined : onCancel}
      />
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-desc"
        className={`${VISION_PANEL} pointer-events-auto relative z-10 w-full max-w-sm p-5`}
      >
        <div className="flex items-start justify-between gap-2">
          <h2
            id="confirm-modal-title"
            className="text-[16px] font-bold text-[#191F28]"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg p-1 text-[#8B95A1] hover:bg-[#F7F8FA] disabled:opacity-50"
          >
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>
        <p
          id="confirm-modal-desc"
          className="mt-3 whitespace-pre-line text-[13px] leading-relaxed text-[#4E5968]"
        >
          {message}
        </p>
        <div className="mt-5 flex gap-2">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className={`${VISION_GHOST_BTN} flex-1 !min-h-[44px]`}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`${confirmClass} disabled:opacity-50`}
          >
            {busy ? "처리 중…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
