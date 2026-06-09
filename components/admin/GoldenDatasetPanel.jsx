"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/api/clientAuth";
import { GOLDEN_INDUSTRY_OPTIONS } from "@/lib/golden/goldenIndustryKeys";

const EMPTY_FORM = {
  title: "",
  content: "",
  industry: "flower_shop",
  writing_style: "brand_column",
  emotion_type: "warm_informative",
  search_intent: "seasonal_recommendation",
  brand_presence_score: 85,
  sample_kind: "excellent",
  fail_reason: "custom_failure",
};

function emptyFormForKind(kind = "excellent") {
  return { ...EMPTY_FORM, sample_kind: kind };
}

export default function GoldenDatasetPanel({ showToast, embedded = false, sampleKind = "excellent" }) {
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState(() => emptyFormForKind(sampleKind));
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (filter) qs.set("industry", filter);
      qs.set("sample_kind", sampleKind);
      const res = await fetchWithAuth(`/api/admin/golden-dataset?${qs.toString()}`);
      setSamples(res.samples || []);
    } catch (err) {
      showToast?.(err?.message || "우수글 목록을 불러오지 못했습니다.", "error");
    } finally {
      setLoading(false);
    }
  }, [filter, sampleKind, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setForm(emptyFormForKind(sampleKind));
    setEditingId(null);
  };

  const onEdit = (sample) => {
    setEditingId(sample.id);
    setForm({
      title: sample.title || "",
      content: sample.content || "",
      industry: sample.industry || "etc",
      writing_style: sample.writing_style || "",
      emotion_type: sample.emotion_type || "",
      search_intent: sample.search_intent || "",
      brand_presence_score: Number(sample.brand_presence_score || 0),
      sample_kind: sample.sample_kind || sampleKind,
      fail_reason: sample.fail_reason || sample.search_intent || "custom_failure",
    });
  };

  const onSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      showToast?.("제목과 본문을 입력해 주세요.", "error");
      return;
    }
    setSaving(true);
    const payload = { ...form, sample_kind: sampleKind };
    try {
      if (editingId) {
        await fetchWithAuth(`/api/admin/golden-dataset/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        showToast?.("저장되었습니다.", "success");
      } else {
        await fetchWithAuth("/api/admin/golden-dataset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        showToast?.("등록되었습니다.", "success");
      }
      resetForm();
      await load();
    } catch (err) {
      showToast?.(err?.message || "저장에 실패했습니다.", "error");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm("이 우수글을 삭제(비활성)할까요?")) return;
    try {
      await fetchWithAuth(`/api/admin/golden-dataset/${id}`, { method: "DELETE" });
      showToast?.("삭제되었습니다.", "success");
      if (editingId === id) resetForm();
      await load();
    } catch (err) {
      showToast?.(err?.message || "삭제에 실패했습니다.", "error");
    }
  };

  return (
    <section className={embedded ? "" : "mt-8 rounded-xl border border-[#E8EBED] bg-white p-5"}>
      <div className={`flex flex-wrap items-center justify-between gap-3 ${embedded ? "mb-3" : ""}`}>
        {!embedded && (
        <div>
          <h2 className="text-[16px] font-bold text-[#191F28]">우수글 데이터셋</h2>
          <p className="mt-1 text-[12px] text-[#8B95A1]">
            해신기획 우수글 Golden Dataset — 생성 시 상위 5개 참조 · 품질 게이트 비교 기준
          </p>
        </div>
        )}
        {embedded && (
          <p className="text-[12px] text-[#8B95A1]">
            등록된 우수글은 생성·품질 게이트에 즉시 반영됩니다 (코드 시드 6건 고정)
          </p>
        )}
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg border border-[#E8EBED] px-3 py-2 text-[13px]"
        >
          <option value="">전체 업종</option>
          {GOLDEN_INDUSTRY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className={embedded ? "mt-0" : "mt-4 grid gap-4 lg:grid-cols-2"}>
        <div className="space-y-3 rounded-lg border border-[#E8EBED] bg-[#F7F8FA] p-4">
          <h3 className="text-[14px] font-semibold">
            {editingId
              ? sampleKind === "failure"
                ? "실패글 수정"
                : "우수글 수정"
              : sampleKind === "failure"
                ? "실패글 등록"
                : "우수글 등록"}
          </h3>
          <input
            className="w-full rounded-lg border border-[#E8EBED] px-3 py-2 text-[13px]"
            placeholder="제목"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
          <select
            className="w-full rounded-lg border border-[#E8EBED] px-3 py-2 text-[13px]"
            value={form.industry}
            onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
          >
            {GOLDEN_INDUSTRY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {!embedded && (
          <select
            className="w-full rounded-lg border border-[#E8EBED] px-3 py-2 text-[13px]"
            value={form.sample_kind}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                sample_kind: e.target.value,
              }))
            }
          >
            <option value="excellent">우수글 (excellent)</option>
            <option value="failure">실패글 (failure)</option>
          </select>
          )}
          {sampleKind === "failure" && (
            <input
              className="w-full rounded-lg border border-[#E8EBED] px-3 py-2 text-[13px]"
              placeholder="fail_reason (placeholder, voice_mix, industry_mix…)"
              value={form.fail_reason}
              onChange={(e) => setForm((f) => ({ ...f, fail_reason: e.target.value }))}
            />
          )}
          <div className="grid grid-cols-2 gap-2">
            <input
              className="rounded-lg border border-[#E8EBED] px-3 py-2 text-[13px]"
              placeholder="writing_style"
              value={form.writing_style}
              onChange={(e) => setForm((f) => ({ ...f, writing_style: e.target.value }))}
            />
            <input
              className="rounded-lg border border-[#E8EBED] px-3 py-2 text-[13px]"
              placeholder="emotion_type"
              value={form.emotion_type}
              onChange={(e) => setForm((f) => ({ ...f, emotion_type: e.target.value }))}
            />
          </div>
          <input
            className="w-full rounded-lg border border-[#E8EBED] px-3 py-2 text-[13px]"
            placeholder="search_intent"
            value={form.search_intent}
            onChange={(e) => setForm((f) => ({ ...f, search_intent: e.target.value }))}
          />
          <input
            type="number"
            min={0}
            max={100}
            className="w-full rounded-lg border border-[#E8EBED] px-3 py-2 text-[13px]"
            placeholder="brand_presence_score"
            value={form.brand_presence_score}
            onChange={(e) =>
              setForm((f) => ({ ...f, brand_presence_score: Number(e.target.value) }))
            }
          />
          <textarea
            className="min-h-[200px] w-full rounded-lg border border-[#E8EBED] px-3 py-2 text-[13px] leading-relaxed"
            placeholder="본문 (우수글 전문)"
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={onSave}
              className="rounded-lg bg-[#03A94D] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
            >
              {saving ? "저장 중…" : editingId ? "수정 저장" : "등록"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-[#E8EBED] px-4 py-2 text-[13px]"
              >
                취소
              </button>
            )}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[12px] text-[#8B95A1]">
            {loading ? "불러오는 중…" : `총 ${samples.length}건 · DB 미적용 시 config/golden-dataset/samples.json`}
          </p>
          <ul className="max-h-[520px] space-y-2 overflow-y-auto">
            {samples.map((s) => (
              <li
                key={s.id}
                className="rounded-lg border border-[#E8EBED] bg-white p-3 text-[12px]"
              >
                <p className="font-semibold text-[#191F28]">{s.title}</p>
                <p className="mt-1 text-[#8B95A1]">
                  {s.industry} · {s.sample_kind || "excellent"} · {s.writing_style || "—"} · 브랜드 {s.brand_presence_score ?? "—"}점
                  {String(s.id || "").startsWith("seed-") ? " · 시드" : ""}
                </p>
                <p className="mt-2 line-clamp-3 text-[#4E5968]">{s.content}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(s)}
                    className="text-[#03A94D] hover:underline"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(s.id)}
                    className="text-[#E42939] hover:underline"
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))}
            {!loading && samples.length === 0 && (
              <li className="text-[13px] text-[#8B95A1]">등록된 샘플이 없습니다. 코드 시드 6건은 항상 포함됩니다.</li>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}
