"use client";

const SECTIONS = [
  { id: "now", label: "지금" },
  { id: "quality", label: "품질" },
  { id: "growth", label: "성장" },
  { id: "system", label: "시스템" },
];

/**
 * @param {{ active: string, onChange: (id: string) => void }} props
 */
export default function AdminSectionNav({ active, onChange }) {
  return (
    <nav
      className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-[#E8EBED] bg-white p-1.5"
      aria-label="관리자 섹션"
    >
      {SECTIONS.map((s) => {
        const on = active === s.id;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange(s.id)}
            className={`rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-colors ${
              on
                ? "bg-[#191F28] text-white shadow-sm"
                : "text-[#4E5968] hover:bg-[#F7F8FA]"
            }`}
          >
            {s.label}
          </button>
        );
      })}
    </nav>
  );
}

export { SECTIONS };
