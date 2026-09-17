"use client";

import {
  ADMIN_SECTION_NAV,
  ADMIN_TAB_ACTIVE,
  ADMIN_TAB_IDLE,
} from "@/lib/admin/adminVision2030Styles";

/** 공개 홈 Discover → System 언어와 정렬 */
const SECTIONS = [
  { id: "now", label: "Today", hint: "상태·위험" },
  { id: "growth", label: "Inflow", hint: "가입·유입" },
  { id: "quality", label: "Quality", hint: "배치·품질" },
  { id: "system", label: "System", hint: "트렌드·운영" },
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
