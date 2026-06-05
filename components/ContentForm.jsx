"use client";

import { useState } from "react";
import {
  BUSINESS_TYPE_OPTIONS,
  PURPOSE_OPTIONS,
  TONE_OPTIONS,
} from "@/lib/constants";
import { QUICK_PRESETS } from "@/lib/formPresets";
import { getDefaultIndustry, getIndustriesForType } from "@/lib/prompts/businessTypes";
import ChipSelect from "./ChipSelect";
import MatrixPreview from "./MatrixPreview";

const inputClass =
  "w-full rounded-xl border border-[#E8EBED] bg-[#FAFBFC] px-3 py-2.5 text-[14px] text-[#191F28] placeholder:text-[#B0B8C1] outline-none transition focus:border-[#03C75A] focus:bg-white focus:ring-2 focus:ring-[#03C75A]/15";

const inputErrorClass =
  "w-full rounded-xl border border-[#FF6B6B] bg-[#FFF5F5] px-3 py-2.5 text-[14px] text-[#191F28] outline-none ring-2 ring-[#FF6B6B]/20";

const labelClass = "mb-1 block text-[11px] font-semibold text-[#8B95A1]";

function FieldLabel({ children, required }) {
  return (
    <span className={labelClass}>
      {children}
      {required && <span className="ml-0.5 text-[#FF6B6B]">*</span>}
    </span>
  );
}

export default function ContentForm({
  values,
  errors = {},
  onChange,
  onApplyPreset,
  children,
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const industries = getIndustriesForType(values.businessType);
  const btHint = BUSINESS_TYPE_OPTIONS.find(
    (o) => o.value === values.businessType
  )?.hint;

  const set = (key, val) => onChange({ ...values, [key]: val });

  const handleBusinessTypeChange = (next) => {
    onChange({
      ...values,
      businessType: next,
      industry: getDefaultIndustry(next),
    });
  };

  const fieldClass = (key) => (errors[key] ? inputErrorClass : inputClass);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="rounded-2xl border border-[#E8EBED] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
        {/* 빠른 시작 */}
        <div className="border-b border-[#E8EBED] p-3 md:p-4">
          <p className="mb-2 text-[11px] font-bold text-[#4E5968]">
            빠른 시작
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {QUICK_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onApplyPreset(p)}
                className="shrink-0 rounded-full border border-[#E8EBED] bg-[#FAFBFC] px-3 py-1.5 text-[11px] font-semibold text-[#4E5968] transition hover:border-[#03C75A] hover:bg-[#E8F9EF] hover:text-[#03A94D]"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 p-3 md:p-4">
          <MatrixPreview values={values} />

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <FieldLabel required>비즈니스 유형</FieldLabel>
              <select
                value={values.businessType}
                onChange={(e) => handleBusinessTypeChange(e.target.value)}
                className={fieldClass("businessType")}
              >
                {BUSINESS_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {btHint && (
                <p className="mt-1 text-[10px] text-[#8B95A1]">{btHint}</p>
              )}
            </label>
            <label className="block">
              <FieldLabel required>세부 업종</FieldLabel>
              <select
                value={values.industry}
                onChange={(e) => set("industry", e.target.value)}
                className={fieldClass("industry")}
              >
                {industries.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <ChipSelect
            label="콘텐츠 목적"
            options={PURPOSE_OPTIONS}
            value={values.purpose}
            onChange={(v) => set("purpose", v)}
            columns={3}
          />

          <ChipSelect
            label="톤앤매너"
            options={TONE_OPTIONS}
            value={values.tone}
            onChange={(v) => set("tone", v)}
            columns={3}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <FieldLabel required>지역</FieldLabel>
              <input
                value={values.region}
                onChange={(e) => set("region", e.target.value)}
                placeholder="예: 서울 강남구"
                className={fieldClass("region")}
              />
              {errors.region && (
                <p className="mt-1 text-[11px] text-[#FF6B6B]">{errors.region}</p>
              )}
            </label>
            <label className="block">
              <FieldLabel required>매장·브랜드명</FieldLabel>
              <input
                value={values.brandName}
                onChange={(e) => set("brandName", e.target.value)}
                placeholder="예: 모카하우스 성수점"
                className={fieldClass("brandName")}
              />
              {errors.brandName && (
                <p className="mt-1 text-[11px] text-[#FF6B6B]">
                  {errors.brandName}
                </p>
              )}
            </label>
            <label className="block sm:col-span-2">
              <FieldLabel required>메인 키워드</FieldLabel>
              <input
                value={values.mainKeyword}
                onChange={(e) => set("mainKeyword", e.target.value)}
                placeholder="예: 강남 꽃다발 — 네이버 검색어"
                className={fieldClass("mainKeyword")}
              />
              {errors.mainKeyword && (
                <p className="mt-1 text-[11px] text-[#FF6B6B]">
                  {errors.mainKeyword}
                </p>
              )}
            </label>
            <label className="block sm:col-span-2">
              <FieldLabel>서브 키워드</FieldLabel>
              <input
                value={values.subKeyword}
                onChange={(e) => set("subKeyword", e.target.value)}
                placeholder="기념일, 웨딩 — 쉼표 구분"
                className={inputClass}
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() => setAdvancedOpen(!advancedOpen)}
            className="flex w-full items-center justify-between rounded-xl border border-[#E8EBED] bg-[#FAFBFC] px-3 py-2 text-[12px] font-semibold text-[#4E5968]"
          >
            더 맞추기 (선택)
            <span className="text-[#8B95A1]">{advancedOpen ? "▲" : "▼"}</span>
          </button>

          {advancedOpen && (
            <div className="grid gap-3 rounded-xl border border-[#E8EBED] bg-[#FAFBFC] p-3">
              <label className="block">
                <FieldLabel>매장·서비스 특징</FieldLabel>
                <input
                  value={values.storeFeatures}
                  onChange={(e) => set("storeFeatures", e.target.value)}
                  placeholder="예: 당일 제작, 주차, 1:1 상담"
                  className={inputClass}
                />
              </label>
              <label className="block">
                <FieldLabel>혜택·이벤트</FieldLabel>
                <input
                  value={values.benefit}
                  onChange={(e) => set("benefit", e.target.value)}
                  placeholder="예: 예약 10% 할인"
                  className={inputClass}
                />
              </label>
              <label className="block">
                <FieldLabel>제외 표현</FieldLabel>
                <input
                  value={values.excludePhrases}
                  onChange={(e) => set("excludePhrases", e.target.value)}
                  placeholder="예: 완치, 100%, 최고 (병원·신뢰형)"
                  className={inputClass}
                />
              </label>
            </div>
          )}

          {children}
        </div>
      </div>
      <p className="mt-2 text-center text-[10px] text-[#B0B8C1]">
        Ctrl+Enter 로 생성 · 입력값은 자동 저장됩니다
      </p>
    </div>
  );
}
