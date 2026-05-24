"use client";

import { EDITOR_IMPROVE_ACTIONS } from "@/lib/editorAI/autoImprove";

export default function ImprovementButtons({ onImprove, loading = false }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {EDITOR_IMPROVE_ACTIONS.map((a) => (
        <button
          key={a.id}
          type="button"
          disabled={loading}
          onClick={() => onImprove?.(a.id)}
          className="briclog-pressable rounded-full border border-[#E8EBED] bg-white px-2.5 py-1 text-[11px] font-medium text-[#4E5968] hover:border-[#03C75A] hover:bg-[#E8F9EF] hover:text-[#03A94D] disabled:opacity-50"
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}
