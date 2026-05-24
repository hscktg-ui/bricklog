"use client";

import Icon from "@/components/Icon";
import CopyCard from "@/components/CopyCard";
import FullCopyButton from "@/components/FullCopyButton";
import BlogSourcePanel from "@/components/BlogSourcePanel";
import { IMAGE_KPI_OPTIONS, IMAGE_RATIO_OPTIONS } from "@/lib/constants";

const PROMPT_KEY = {
  thumbnail: "thumbnailPrompt",
  place: "placeImagePrompt",
  insta: "instagramCardPrompt",
  banner: "bannerPrompt",
};

export default function ImageEnginePreparing({
  blog,
  blogInput,
  baseLabel,
  imagePack,
  imageOptions,
  onOptionsChange,
  generating,
  onGeneratePrompt,
  onCopy,
}) {
  const key = PROMPT_KEY[imageOptions.purpose] || "thumbnailPrompt";
  const activePrompt = imagePack?.[key] || "";

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="min-h-0 w-full shrink-0 overflow-y-auto border-r border-[#E8EBED] bg-[#F7F8FA] p-6 lg:w-[320px]">
        <div className="rounded-xl border border-dashed border-[#03C75A]/30 bg-white p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#03A94D]">
            Image Engine
          </p>
          <p className="mt-2 text-[22px] font-bold text-[#191F28]">Preparing…</p>
          <p className="mt-2 text-[12px] leading-relaxed text-[#8B95A1]">
            실제 이미지 생성은 준비 중입니다.
            <br />
            지금은 <strong className="text-[#4E5968]">프롬프트 설계</strong>만
            지원합니다.
          </p>
        </div>
        <div className="mt-5">
          <BlogSourcePanel blog={blog} baseLabel={baseLabel} compact />
        </div>
        <KpiSelect
          label="이미지 KPI"
          options={IMAGE_KPI_OPTIONS}
          value={imageOptions.imageKpi || "ctr"}
          onChange={(v) => {
            const opt = IMAGE_KPI_OPTIONS.find((o) => o.value === v);
            onOptionsChange({
              ...imageOptions,
              imageKpi: v,
              purpose: opt?.imagePurpose || imageOptions.purpose,
              tone: opt?.tone || imageOptions.tone,
            });
          }}
        />
        <KpiSelect
          label="비율"
          options={IMAGE_RATIO_OPTIONS}
          value={imageOptions.ratio}
          onChange={(v) => onOptionsChange({ ...imageOptions, ratio: v })}
        />
        <button
          type="button"
          disabled={generating}
          onClick={onGeneratePrompt}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#191F28] py-3 text-[14px] font-semibold text-white hover:bg-[#2d3339] disabled:opacity-50"
        >
          {generating ? "프롬프트 생성 중…" : "프롬프트 생성"}
        </button>
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-white p-6 md:p-8">
        {imagePack ? (
          <div className="mx-auto max-w-2xl space-y-4">
            <div className="flex justify-end gap-2">
              <FullCopyButton
                text={imagePack.fullCopyText}
                onCopy={() => onCopy?.(imagePack.fullCopyText)}
              />
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-[#F7F8FA] px-3 py-2 text-[11px] text-[#8B95A1]">
              <Icon name="sparkles" className="h-4 w-4 text-[#03C75A]" />
              프롬프트만 생성됨 · API 연동 예정
            </div>
            <CopyCard label="선택 프롬프트" value={activePrompt} />
            {imagePack.thumbnailPrompt && (
              <CopyCard label="썸네일" value={imagePack.thumbnailPrompt} variant="muted" />
            )}
            {imagePack.placeImagePrompt && (
              <CopyCard label="플레이스" value={imagePack.placeImagePrompt} variant="muted" />
            )}
            {imagePack.instagramCardPrompt && (
              <CopyCard label="인스타" value={imagePack.instagramCardPrompt} variant="muted" />
            )}
          </div>
        ) : (
          <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F7F8FA] ring-1 ring-[#E8EBED]">
              <Icon name="image" className="h-8 w-8 text-[#B0B8C1]" />
            </div>
            <p className="mt-4 text-[15px] font-medium text-[#4E5968]">
              블로그 기반 비주얼 프롬프트
            </p>
            <p className="mt-1 max-w-xs text-[13px] text-[#8B95A1]">
              왼쪽에서 KPI를 고르고 프롬프트를 생성하세요
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiSelect({ label, options, value, onChange }) {
  return (
    <div className="mt-4">
      <p className="text-[12px] font-medium text-[#4E5968]">{label}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-medium ${
              value === o.value
                ? "border-[#03C75A] bg-[#E8F9EF] text-[#03A94D]"
                : "border-[#E8EBED] bg-white text-[#4E5968]"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
