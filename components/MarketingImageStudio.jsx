"use client";

import { useCallback, useEffect, useState } from "react";
import ChannelLayoutToggle from "@/components/ChannelLayoutToggle";
import Icon from "@/components/Icon";
import { useChannelLayoutMode } from "@/hooks/useChannelLayoutMode";
import { useEffectiveViewport } from "@/hooks/useEffectiveViewport";
import CopyCard from "@/components/CopyCard";
import BlogSourcePanel from "@/components/BlogSourcePanel";
import { IMAGE_TYPES } from "@/lib/images/imageTypes";
import { IMAGE_RENDERING_UI_ENABLED } from "@/lib/channels/channelProducts";
import { CHANNEL_PRODUCTS } from "@/lib/channels/channelProducts";

const RATIO_OPTIONS = [
  { value: "auto", label: "자동" },
  { value: "1:1", label: "1:1" },
  { value: "4:5", label: "4:5" },
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
];

const VARIANTS = [
  { id: "default", label: "프롬프트 만들기" },
  { id: "alt_style", label: "다른 스타일" },
  { id: "alt_composition", label: "다른 구도" },
  { id: "alt_color", label: "다른 컬러" },
];

export default function MarketingImageStudio({
  blog,
  blogInput,
  baseLabel,
  imagePack,
  imageOptions,
  onOptionsChange,
  generating,
  onGeneratePrompt,
  onCopy,
  brandId,
  onToast,
}) {
  const [imageType, setImageType] = useState("blog_thumbnail");
  const [ratio, setRatio] = useState(imageOptions?.ratio || "auto");
  const [generatingImage, setGeneratingImage] = useState(false);
  const [gallery, setGallery] = useState([]);
  const [controlsOpen, setControlsOpen] = useState(true);
  const { isMobile } = useEffectiveViewport();
  const { layoutMode, concise, setLayoutMode } = useChannelLayoutMode("image");

  useEffect(() => {
    if (gallery.length > 0 && isMobile && concise) {
      setControlsOpen(false);
    }
  }, [gallery.length, isMobile, concise]);

  const blogTitle =
    blog?.title || blog?.headline || blogInput?.mainKeyword || "";
  const blogExcerpt =
    blog?.body?.slice?.(0, 400) ||
    blog?.plainText?.slice?.(0, 400) ||
    "";

  const runGenerate = useCallback(
    async (variant) => {
      if (!imagePack && variant === "default") {
        onGeneratePrompt?.();
        return;
      }
      setGeneratingImage(true);
      try {
        const data = await fetchWithAuth("/api/images/generate", {
          method: "POST",
          body: JSON.stringify({
            imagePack,
            type: imageType,
            ratio,
            industry: blogInput?.industry || "",
            brandId,
            brandName: blogInput?.brandName || "",
            blogTitle,
            blogExcerpt,
            variant,
          }),
        });
        if (!data.ok) {
          onToast?.(data.userMessage || "이미지 생성에 실패했습니다.", "error");
          return;
        }
        if (data.usageWarning) {
          onToast?.("이번 달 사용량이 80%를 넘었습니다.", "info");
        }
        setGallery((prev) => [
          {
            id: `${Date.now()}`,
            url: data.imageUrl,
            type: data.typeLabel,
            ratio: data.ratio,
            variant,
          },
          ...prev,
        ]);
        onToast?.("이미지가 생성되었습니다.", "success");
      } catch (err) {
        onToast?.(err.message || "이미지 생성에 실패했습니다.", "error");
      } finally {
        setGeneratingImage(false);
      }
    },
    [
      imagePack,
      imageType,
      ratio,
      blogInput,
      brandId,
      blogTitle,
      blogExcerpt,
      onGeneratePrompt,
      onToast,
    ]
  );

  const busy = generating || generatingImage;

  const hideControls =
    isMobile && concise && gallery.length > 0 && !controlsOpen;

  return (
    <div className="workspace-shell flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
      {gallery.length > 0 && isMobile && (
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#E8EBED] bg-[#F7F8FA] px-4 py-2 md:hidden">
          <button
            type="button"
            onClick={() => setControlsOpen((o) => !o)}
            className="min-h-[40px] rounded-lg border border-[#E8EBED] bg-white px-3 py-2 text-[12px] font-semibold text-[#4E5968]"
          >
            {controlsOpen ? "갤러리 보기" : "유형·생성"}
          </button>
          <ChannelLayoutToggle layoutMode={layoutMode} onChange={setLayoutMode} />
        </div>
      )}
      <div
        className={`min-h-0 w-full shrink-0 overflow-y-auto border-[#E8EBED] bg-[#F7F8FA] p-4 max-md:border-b md:border-r md:w-[300px] md:p-6 lg:w-[320px] ${
          hideControls ? "hidden" : "md:block"
        }`}
      >
        <div className="rounded-xl border border-[#03C75A]/30 bg-white p-4">
          <p className="text-[11px] font-bold tracking-wider text-[#03A94D]">
            {CHANNEL_PRODUCTS.image.shortLabel}
          </p>
          <p className="mt-2 text-[18px] font-bold text-[#191F28]">
            {CHANNEL_PRODUCTS.image.headerTitle}
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-[#8B95A1]">
            {CHANNEL_PRODUCTS.image.emptyDesc}
          </p>
        </div>

        <div className="mt-5">
          <BlogSourcePanel blog={blog} baseLabel={baseLabel} compact />
        </div>

        <TypeSelect value={imageType} onChange={setImageType} />
        {IMAGE_RENDERING_UI_ENABLED ? (
          <RatioSelect value={ratio} onChange={setRatio} />
        ) : null}

        {!imagePack ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onGeneratePrompt?.()}
            className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#03C75A] py-3 text-[14px] font-semibold text-white hover:bg-[#02B350] disabled:opacity-50"
          >
            {generating ? "프롬프트 준비 중…" : CHANNEL_PRODUCTS.image.generateLabel}
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => onGeneratePrompt?.()}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#E8EBED] bg-white py-2.5 text-[13px] font-semibold text-[#4E5968] hover:border-[#03C75A] disabled:opacity-50"
          >
            다시 만들기
          </button>
        )}

        {IMAGE_RENDERING_UI_ENABLED ? (
          <div className="mt-4 flex flex-col gap-2">
            {VARIANTS.map((v) => (
              <button
                key={v.id}
                type="button"
                disabled={busy || (v.id !== "default" && !imagePack)}
                onClick={() => runGenerate(v.id)}
                className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[13px] font-semibold disabled:opacity-50 ${
                  v.id === "default"
                    ? "bg-[#03C75A] text-white hover:bg-[#02B350]"
                    : "border border-[#E8EBED] bg-white text-[#4E5968] hover:border-[#03C75A]"
                }`}
              >
                {busy && v.id === "default" ? "생성 중…" : v.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="workspace-result-scroll min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-white p-4 md:p-6 lg:p-8">
        {!isMobile && (
          <div className="mb-4 flex justify-end">
            <ChannelLayoutToggle layoutMode={layoutMode} onChange={setLayoutMode} />
          </div>
        )}
        {IMAGE_RENDERING_UI_ENABLED && gallery.length > 0 ? (
          <div className="mx-auto max-w-3xl">
            <h3 className="text-[14px] font-semibold text-[#191F28]">
              생성된 이미지
            </h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {gallery.map((item) => (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-xl border border-[#E8EBED]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.url}
                    alt={item.type}
                    className="aspect-video w-full object-cover"
                  />
                  <div className="flex items-center justify-between gap-2 p-3">
                    <span className="text-[11px] text-[#8B95A1]">
                      {item.type} · {item.ratio}
                    </span>
                    <a
                      href={item.url}
                      download={`briclog-${item.id}.png`}
                      className="rounded-lg bg-[#F7F8FA] px-2 py-1 text-[11px] font-semibold text-[#03A94D] hover:bg-[#E8F9EF]"
                    >
                      다운로드
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : imagePack ? (
          <div className="mx-auto max-w-2xl space-y-4">
            <div className="flex items-center gap-2 rounded-lg bg-[#E8F9EF] px-3 py-2 text-[11px] text-[#03A94D]">
              <Icon name="sparkles" className="h-4 w-4" />
              프롬프트 준비 완료 · 복사해 이미지 도구에 붙여 넣으세요
            </div>
            <CopyCard
              label="썸네일 프롬프트"
              value={imagePack.thumbnailPrompt || ""}
            />
            {imagePack.placeImagePrompt ? (
              <CopyCard
                label="플레이스 비주얼"
                value={imagePack.placeImagePrompt}
              />
            ) : null}
            {imagePack.instaVisualPrompt ? (
              <CopyCard
                label="인스타 비주얼"
                value={imagePack.instaVisualPrompt}
              />
            ) : null}
            {!IMAGE_RENDERING_UI_ENABLED ? (
              <p className="text-center text-[12px] text-[#8B95A1]">
                앱 안 이미지 생성은 준비 중입니다. 지금은 문구만 제공합니다.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F7F8FA] ring-1 ring-[#E8EBED]">
              <Icon name="image" className="h-8 w-8 text-[#B0B8C1]" />
            </div>
            <p className="mt-4 text-[15px] font-medium text-[#4E5968]">
              왼쪽에서 프롬프트를 만들어 주세요
            </p>
            <p className="mt-1 max-w-xs text-[13px] text-[#8B95A1]">
              이야기·플레이스·인스타 초안이 있으면 톤을 이어받습니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function TypeSelect({ value, onChange }) {
  return (
    <div className="mt-4">
      <p className="text-[12px] font-medium text-[#4E5968]">프롬프트 유형</p>
      <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
        {IMAGE_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`block w-full rounded-lg px-2.5 py-1.5 text-left text-[11px] font-medium ${
              value === t.id
                ? "bg-[#E8F9EF] text-[#03A94D]"
                : "text-[#4E5968] hover:bg-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function RatioSelect({ value, onChange }) {
  return (
    <div className="mt-4">
      <p className="text-[12px] font-medium text-[#4E5968]">비율</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {RATIO_OPTIONS.map((o) => (
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
