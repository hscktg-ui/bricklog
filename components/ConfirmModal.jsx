"use client";

import Icon from "@/components/Icon";

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
  if (!open) return null;

  const confirmClass =
    variant === "danger"
      ? "bg-[#E42939] hover:bg-[#C91F2E]"
      : "bg-[#03C75A] hover:bg-[#02B350]";

  return (
    <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        role="presentation"
        aria-hidden
        className="pointer-events-auto absolute inset-0 bg-black/40"
        onClick={busy ? undefined : onCancel}
      />
      <div
        role="alertdialog"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-desc"
        className="pointer-events-auto relative z-10 w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
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
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-xl border border-[#E8EBED] py-2.5 text-[13px] font-semibold text-[#4E5968] hover:bg-[#F7F8FA] disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`flex-1 rounded-xl py-2.5 text-[13px] font-semibold text-white disabled:opacity-50 ${confirmClass}`}
          >
            {busy ? "처리 중…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
