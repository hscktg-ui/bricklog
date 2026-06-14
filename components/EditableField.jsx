"use client";

import {
  VISION_FORM_FIELD,
  VISION_FORM_PANEL,
} from "@/lib/landing/vision2030Styles";

export default function EditableField({
  label,
  value,
  onChange,
  rows = 4,
  hint,
  onDelete,
}) {
  return (
    <div className={VISION_FORM_PANEL}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[12px] font-semibold text-[var(--vision-muted)]">
          {label}
        </span>
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="text-[11px] font-medium text-[#ff9500] hover:underline"
          >
            삭제
          </button>
        ) : null}
      </div>
      <textarea
        className={VISION_FORM_FIELD}
        rows={rows}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint ? (
        <p className="mt-1 text-[11px] text-[var(--vision-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}
