"use client";

const areaClass =
  "w-full rounded-lg border border-[#E8EBED] bg-white px-3 py-2.5 text-[14px] leading-relaxed text-[#191F28] focus:border-[#03C75A] focus:outline-none focus:ring-2 focus:ring-[#03C75A]/15";

export default function EditableField({
  label,
  value,
  onChange,
  rows = 4,
  hint,
  onDelete,
}) {
  return (
    <div className="rounded-xl border border-[#E8EBED] bg-[#FAFBFC] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[12px] font-bold text-[#4E5968]">{label}</span>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="text-[11px] font-medium text-[#E67700] hover:underline"
          >
            삭제
          </button>
        )}
      </div>
      <textarea
        className={areaClass}
        rows={rows}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <p className="mt-1 text-[11px] text-[#8B95A1]">{hint}</p>}
    </div>
  );
}
