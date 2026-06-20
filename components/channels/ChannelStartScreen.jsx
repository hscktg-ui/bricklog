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
import {
  VISION_CTA_ACCENT,
  VISION_EYEBROW,
  VISION_STATUS_OK,
  VISION_WORKSPACE_PANEL,
} from "@/lib/landing/vision2030Styles";

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
      className={`workspace-shell flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden bg-[var(--vision-paper)] ${
        compact ? "p-3" : "p-4 md:p-6"
      }`}
    >
      <div className="workspace-shell-inner mx-auto space-y-3 md:space-y-4">
        <div
          className={`flex items-start gap-3 ${VISION_WORKSPACE_PANEL} ${
            compact ? "px-3 py-2.5" : "px-4 py-3"
          }`}
        >
          <div
            className={`flex shrink-0 items-center justify-center rounded-xl bg-[var(--vision-accent-soft,rgba(3,199,90,0.12))] ${
              compact ? "h-9 w-9" : "h-11 w-11"
            }`}
          >
            <Icon
              name={ICON_MAP[channel] || "document"}
              className={
                compact
                  ? "h-4 w-4 text-[var(--vision-accent-deep,#03a94d)]"
                  : "h-5 w-5 text-[var(--vision-accent-deep,#03a94d)]"
              }
            />
          </div>
          <div className="min-w-0">
            <p className={compact ? "text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--vision-accent-deep,#03a94d)]" : VISION_EYEBROW}>
              {product.menuLabel} · 브리프
            </p>
            <h2
              className={
                compact
                  ? "text-[16px] font-semibold tracking-tight text-[var(--vision-ink)]"
                  : "text-[17px] font-semibold tracking-tight text-[var(--vision-ink)]"
              }
            >
              {product.startTitle || product.emptyTitle}
            </h2>
            {!compact && (
              <p className="mt-1 text-[12px] leading-relaxed text-[var(--vision-muted)]">
                {product.startDesc || product.emptyDesc}
              </p>
            )}
          </div>
        </div>

        {linkBanner && (
          <p className={`px-3 py-2.5 text-[12px] leading-relaxed text-[var(--vision-accent-deep,#03a94d)] ${VISION_STATUS_OK}`}>
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

        <div className="sticky bottom-0 z-10 -mx-1 rounded-2xl border border-[var(--vision-line)] bg-[var(--vision-glass-strong)] p-4 shadow-[var(--vision-shadow-soft)] backdrop-blur-sm">
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
            className={`flex min-h-[48px] w-full items-center justify-center rounded-xl px-4 py-3 text-[14px] font-semibold text-white disabled:opacity-50 ${VISION_CTA_ACCENT}`}
          >
            {generating ? "만드는 중…" : product.generateLabel}
          </button>

          {hasFullBlog && onGenerateFromDraft && (
            <button
              type="button"
              disabled={generating}
              onClick={() => commitAndGenerate({ preferStandalone: false })}
              className="mt-2 flex min-h-[44px] w-full items-center justify-center rounded-xl border border-[var(--vision-accent-ring,rgba(3,199,90,0.35))] bg-[var(--vision-accent-soft,rgba(3,199,90,0.08))] px-4 py-2.5 text-[13px] font-semibold text-[var(--vision-accent-deep,#03a94d)] disabled:opacity-50"
            >
              {channelDeriveButtonLabel(channel, { hasFullBlog, hasOtherDraft })}
            </button>
          )}

          {hasOtherDraft && !hasFullBlog && onGenerateFromDraft && (
            <button
              type="button"
              disabled={generating}
              onClick={() => commitAndGenerate({ preferStandalone: false })}
              className="mt-2 flex min-h-[44px] w-full items-center justify-center rounded-xl border border-[var(--vision-accent-ring,rgba(3,199,90,0.28))] bg-[var(--vision-btn-surface,rgba(3,199,90,0.1))] px-4 py-2.5 text-[13px] font-semibold text-[var(--vision-ink)] disabled:opacity-50"
            >
              {product.deriveFromDraftLabel ||
                channelDeriveButtonLabel(channel, { hasOtherDraft: true })}
            </button>
          )}

          {onGoBlog && (
            <button
              type="button"
              onClick={onGoBlog}
              className="mt-2 w-full text-center text-[12px] font-medium text-[var(--vision-muted)] hover:text-[var(--vision-accent-deep,#03a94d)] hover:underline"
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
