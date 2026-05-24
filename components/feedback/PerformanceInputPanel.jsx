"use client";

import { useState } from "react";
import { fetchWithAuth } from "@/lib/api/clientAuth";

export default function PerformanceInputPanel({ contentItemId }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    views: 0,
    saves: 0,
    comments: 0,
    inquiries: 0,
    phone: 0,
    reservations: 0,
    memo: "",
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await fetchWithAuth("/api/memory/performance", {
        method: "POST",
        body: JSON.stringify({ contentItemId, ...form }),
      });
      setSaved(true);
    } catch {
      /* optional table */
    } finally {
      setSaving(false);
    }
  };

  return (
    <details
      open={open}
      onToggle={(e) => setOpen(e.target.open)}
      className="rounded-xl border border-[#E8EBED] bg-white"
    >
      <summary className="cursor-pointer px-3 py-2 text-[12px] font-medium text-[#4E5968]">
        성과 수치 입력 (선택)
      </summary>
      <div className="border-t border-[#E8EBED] px-3 pb-3">
        <div className="mt-2 grid grid-cols-2 gap-2">
          {[
            ["views", "조회"],
            ["saves", "저장"],
            ["comments", "댓글"],
            ["inquiries", "문의"],
            ["phone", "전화"],
            ["reservations", "예약"],
          ].map(([key, label]) => (
            <label key={key} className="text-[11px] text-[#8B95A1]">
              {label}
              <input
                type="number"
                className="mt-0.5 w-full rounded border border-[#E8EBED] px-2 py-1 text-[12px]"
                value={form[key]}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    [key]: Number(e.target.value) || 0,
                  }))
                }
              />
            </label>
          ))}
        </div>
        <textarea
          className="mt-2 w-full rounded border border-[#E8EBED] px-2 py-1 text-[12px]"
          rows={2}
          placeholder="메모"
          value={form.memo}
          onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
        />
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="mt-2 rounded-lg bg-[#03C75A] px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-50"
        >
          {saving ? "저장 중…" : "성과 저장"}
        </button>
        {saved && (
          <p className="mt-1 text-[11px] text-[#03A94D]">성과가 저장되었습니다.</p>
        )}
      </div>
    </details>
  );
}
