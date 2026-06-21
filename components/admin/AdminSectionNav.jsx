"use client";

import {
  ADMIN_SECTION_NAV,
  ADMIN_TAB_ACTIVE,
  ADMIN_TAB_IDLE,
} from "@/lib/admin/adminVision2030Styles";

const SECTIONS = [
  { id: "now", label: "지금", hint: "오늘" },
  { id: "growth", label: "가입·성장", hint: "퍼널" },
  { id: "quality", label: "품질", hint: "배치" },
  { id: "system", label: "시스템", hint: "상세" },
];

/**
 * @param {{ active: string, onChange: (id: string) => void }} props
 */
export default function AdminSectionNav({ active, onChange }) {
  return (
    <nav className={ADMIN_SECTION_NAV} aria-label="관리자 섹션">
      {SECTIONS.map((s) => {
        const on = active === s.id;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange(s.id)}
            aria-current={on ? "page" : undefined}
            className={on ? ADMIN_TAB_ACTIVE : ADMIN_TAB_IDLE}
          >
            <span>{s.label}</span>
            <span className="ml-1.5 hidden text-[10px] font-medium opacity-70 md:inline">
              {s.hint}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export { SECTIONS };
