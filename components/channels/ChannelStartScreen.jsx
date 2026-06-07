"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Icon from "@/components/Icon";
import DailyTimelinessPanel from "@/components/DailyTimelinessPanel";
import MobileSecondaryAccordion from "@/components/MobileSecondaryAccordion";
import { useWorkspaceCompact } from "@/hooks/useWorkspaceCompact";
import PlaceMarketerForm from "@/components/channels/PlaceMarketerForm";
import InstaMarketerForm from "@/components/channels/InstaMarketerForm";
import ImageBriefFields from "@/components/channels/ImageBriefFields";
import { CHANNEL_PRODUCTS } from "@/lib/channels/channelProducts";
import {
  channelStartLinkBanner,
  channelStartReadyHint,
  channelDeriveButtonLabel,
} from "@/lib/channels/channelHintCopy";
import { canChannelGenerate } from "@/lib/formValidation";
import { useDeferredWorkspaceForm } from "@/lib/hooks/useDeferredWorkspaceForm";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { saveChannelGenPref } from "@/lib/preferences/channelGenerationPrefs";
import ChannelGenPrefToggle, {
  useChannelPreferStandalone,
} from "@/components/channels/ChannelGenPrefToggle";
import ChannelCapabilityCards from "@/components/channels/ChannelCapabilityCards";
import GeneratingResultPlaceholder from "@/components/blog/GeneratingResultPlaceholder";

const ICON_MAP = {
  blog: "document",
  place: "map",
  insta: "camera",
  image: "image",
};

/**
 * 채널별 시작 화면 — 브리프는 로컬, 생성 버튼에서만 Context·파이프라인
 * @param {'place'|'insta'|'image'} channel
 */
export default function ChannelStartScreen({
  channel,
  blogInput,
  setBlogInput,
  activeBrand,
  onGenerate,
  onGenerateFromDraft,
  onGoBlog,
  generating = false,
  hasFullBlog = false,
  hasOtherDraft = false,
  instaTone,
  setInstaTone,
  imageOptions,
  setImageOptions,
  blogContent = null,
  placeContent = null,
  instagramContent = null,
  sourceChannel = null,
  baseContentLabel = null,
}) {
  const product = CHANNEL_PRODUCTS[channel];
  const { draft, setDraft, formApiRef, flushToCommitted, patchDraft } =
    useDeferredWorkspaceForm(blogInput, setBlogInput);
  const debouncedDraft = useDebouncedValue(draft, 400);

  const [preferStandalone, setPreferStandalone] =
    useChannelPreferStandalone(channel);

  const [localInstaTone, setLocalInstaTone] = useState(instaTone || "emotional");
  const [localImageOptions, setLocalImageOptions] = useState(
    imageOptions || {
      purpose: "thumbnail",
      ratio: "1:1",
      tone: "white",
      imageKpi: "ctr",
      provider: "auto",
    }
  );

  useEffect(() => {
    if (instaTone) setLocalInstaTone(instaTone);
  }, [blogInput.brandId, instaTone]);

  useEffect(() => {
    if (imageOptions) setLocalImageOptions(imageOptions);
  }, [blogInput.brandId, imageOptions?.purpose]);

  const ready = useMemo(
    () =>
      canChannelGenerate(debouncedDraft) ||
      Boolean(activeBrand?.brandName?.trim()),
    [debouncedDraft, activeBrand?.brandName]
  );

  const commitAndGenerate = useCallback(
    (opts = {}) => {
      const input = flushToCommitted();
      if (!input) return;
      const standalone =
        opts.preferStandalone !== undefined
          ? opts.preferStandalone
          : preferStandalone;
      saveChannelGenPref(channel, { preferStandalone: standalone });
      if (setInstaTone) setInstaTone(localInstaTone);
      if (setImageOptions) setImageOptions(localImageOptions);
      onGenerate?.({
        ...opts,
        preferStandalone: standalone,
        inputOverride: input,
        instaToneOverride: localInstaTone,
        imageOptionsOverride: localImageOptions,
      });
    },
    [
      channel,
      preferStandalone,
      flushToCommitted,
      setInstaTone,
      localInstaTone,
      setImageOptions,
      localImageOptions,
      onGenerate,
    ]
  );

  const linkBanner = useMemo(
    () => channelStartLinkBanner(channel, { hasFullBlog, hasOtherDraft }),
    [channel, hasFullBlog, hasOtherDraft]
  );

  const recentTopics = useMemo(
    () =>
      (activeBrand?.contentArchive?.blog || [])
        .map((b) => b?.title || b?.representativeTitle)
        .filter(Boolean)
        .slice(0, 5),
    [activeBrand?.contentArchive?.blog]
  );
  const generationCount = activeBrand?.contentArchive?.blog?.length ?? 0;
  const { compact } = useWorkspaceCompact();

  const timelinessPanel = (
    <DailyTimelinessPanel
      channel={channel}
      blogInput={debouncedDraft}
      onChange={(next) => patchDraft(next)}
      brandName={debouncedDraft?.brandName || activeBrand?.brandName}
      brandMemory={activeBrand}
      recentTopics={recentTopics}
      generationCount={generationCount}
      compact={compact}
      onPickTopic={(t) =>
        patchDraft({
          topic: t,
          mainKeyword: t,
          placeHeadline: debouncedDraft?.placeHeadline || t,
        })
      }
    />
  );

  return (
    <div
      className={`workspace-shell flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden bg-[#F7F8FA] ${
        compact ? "p-3" : "p-4 md:p-6"
      }`}
    >
      <div className="workspace-shell-inner mx-auto space-y-3 md:space-y-4">
        <div
          className={`briclog-surface flex items-start gap-3 ${
            compact ? "px-3 py-2.5" : "px-4 py-3"
          }`}
        >
          <div
            className={`flex shrink-0 items-center justify-center rounded-xl bg-[#E8F9EF] ${
              compact ? "h-9 w-9" : "h-11 w-11"
            }`}
          >
            <Icon
              name={ICON_MAP[channel] || "document"}
              className={compact ? "h-4 w-4 text-[#03A94D]" : "h-5 w-5 text-[#03A94D]"}
            />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#03A94D]">
              {product.menuLabel} · 브리프
            </p>
            <h2
              className={
                compact
                  ? "text-[16px] font-bold text-[#191F28]"
                  : "text-[17px] font-bold text-[#191F28]"
              }
            >
              {product.startTitle || product.emptyTitle}
            </h2>
            {!compact && (
              <p className="mt-1 text-[12px] leading-relaxed text-[#8B95A1]">
                {product.startDesc || product.emptyDesc}
              </p>
            )}
          </div>
        </div>

        {linkBanner && (
          <p className="rounded-xl border border-[#03C75A]/25 bg-[#F0FFF5] px-3 py-2.5 text-[12px] leading-relaxed text-[#03A94D]">
            {linkBanner}
          </p>
        )}

        {generating ? (
          <GeneratingResultPlaceholder
            compact={compact}
            phase="writing"
            channelLabel={product.menuLabel}
          />
        ) : (
          <ChannelCapabilityCards channel={channel} compact={compact} />
        )}

        <div
          className={generating ? "pointer-events-none opacity-55" : ""}
          aria-busy={generating || undefined}
        >
          {channel === "place" && (
            <PlaceMarketerForm
              values={draft}
              onChange={setBlogInput}
              onDraftChange={setDraft}
              formApiRef={formApiRef}
              compact={compact}
            />
          )}
          {channel === "insta" && (
            <InstaMarketerForm
              values={draft}
              onChange={setBlogInput}
              onDraftChange={setDraft}
              formApiRef={formApiRef}
              instaTone={localInstaTone}
              onInstaToneChange={setLocalInstaTone}
              compact={compact}
            />
          )}
          {channel === "image" && (
            <ImageBriefFields
              blogInput={draft}
              onDraftChange={setDraft}
              formApiRef={formApiRef}
              imageOptions={localImageOptions}
              setImageOptions={setLocalImageOptions}
              blogContent={blogContent}
              placeContent={placeContent}
              instagramContent={instagramContent}
              sourceChannel={sourceChannel}
              baseContentLabel={baseContentLabel}
              compact={compact}
              deferUntilCommit
            />
          )}
        </div>

        {compact ? (
          <MobileSecondaryAccordion title="TIP · 작성 맥락" collapsed>
            {timelinessPanel}
          </MobileSecondaryAccordion>
        ) : null}

        <div className="sticky bottom-0 z-10 -mx-1 rounded-2xl border border-[#E8EBED] bg-white/95 p-4 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] backdrop-blur-sm">
          {!generating && (
            <ChannelGenPrefToggle
              channel={channel}
              preferStandalone={preferStandalone}
              onPreferStandaloneChange={setPreferStandalone}
              className="mb-3"
            />
          )}

          <button
            type="button"
            data-briclog-generate={channel}
            disabled={generating}
            onClick={() => commitAndGenerate({ preferStandalone })}
            className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-[#03C75A] px-4 py-3 text-[14px] font-semibold text-white hover:bg-[#02B350] disabled:opacity-50"
          >
            {generating ? "만드는 중…" : product.generateLabel}
          </button>

          {hasFullBlog && onGenerateFromDraft && (
            <button
              type="button"
              disabled={generating}
              onClick={() => commitAndGenerate({ preferStandalone: false })}
              className="mt-2 flex min-h-[44px] w-full items-center justify-center rounded-xl border border-[#03C75A]/40 bg-[#F8FDF9] px-4 py-2.5 text-[13px] font-semibold text-[#03A94D] hover:bg-[#E8F9EF] disabled:opacity-50"
            >
              {channelDeriveButtonLabel(channel, { hasFullBlog, hasOtherDraft })}
            </button>
          )}

          {hasOtherDraft && !hasFullBlog && onGenerateFromDraft && (
            <button
              type="button"
              disabled={generating}
              onClick={() => commitAndGenerate({ preferStandalone: false })}
              className="mt-2 flex min-h-[44px] w-full items-center justify-center rounded-xl border border-[#E8EBED] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#4E5968] disabled:opacity-50"
            >
              {product.deriveFromDraftLabel ||
                channelDeriveButtonLabel(channel, { hasOtherDraft: true })}
            </button>
          )}

          {onGoBlog && (
            <button
              type="button"
              onClick={onGoBlog}
              className="mt-2 w-full text-center text-[12px] font-medium text-[#8B95A1] hover:text-[#03A94D] hover:underline"
            >
              {product.goBlogLabel}
            </button>
          )}

          {!ready && (
            <p className="mt-2 text-center text-[11px] text-[#E67700]">
              {channelStartReadyHint(channel)}
            </p>
          )}
        </div>

        {!compact ? timelinessPanel : null}
      </div>
    </div>
  );
}
