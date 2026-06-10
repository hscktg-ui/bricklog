"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useBufferedObjectPatch } from "@/lib/hooks/useBufferedObjectPatch";
import { useWorkspaceCompact } from "@/hooks/useWorkspaceCompact";
import {
  INSTA_FORMAT_OPTIONS,
  INSTA_BODY_LENGTH_OPTIONS,
  INSTA_HASHTAG_COUNT_OPTIONS,
  INSTA_HASHTAG_MODE_OPTIONS,
  INSTA_EMOJI_LEVEL_DEFAULT,
  INSTA_EMOJI_LEVEL_OPTIONS,
  INSTA_TONE_OPTIONS,
} from "@/lib/constants";
import {
  INSTA_CAMPAIGN_GOAL_OPTIONS,
  INSTA_HOOK_ANGLE_OPTIONS,
  INSTA_AUDIENCE_OPTIONS,
} from "@/lib/channels/channelFormConstants";
import {
  ChannelField,
  ChannelFormSection,
  OptionGrid,
  channelFieldClass,
} from "@/components/channels/channelFormUi";
import SteppedWriteFields from "@/components/product/SteppedWriteFields";
import ChannelAiRecommendCard from "@/components/product/ChannelAiRecommendCard";
import {
  INSTA_MOOD_QUESTIONS,
  INSTA_PURPOSE_QUESTIONS,
  resolveChannelAiDefaults,
} from "@/lib/product/channelAiDefaults";
import { isDeferFormUntilCommit } from "@/lib/config/productFlags";

export default function InstaMarketerForm({
  values,
  onChange,
  onDraftChange,
  formApiRef,
  instaTone,
  onInstaToneChange,
  setInstaTone,
  compact: compactProp,
  deferParentSync = isDeferFormUntilCommit(),
}) {
  const { compact: compactViewport } = useWorkspaceCompact();
  const compact = compactProp ?? compactViewport;
  const setTone = onInstaToneChange || setInstaTone;
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const regionInputRef = useRef(null);
  const topicRef = useRef(null);
  const regionComposingRef = useRef(false);

  const {
    values: formValues,
    patch,
    patchImmediate,
    flushPending,
    syncParent,
    getValues,
    replaceAll,
  } = useBufferedObjectPatch(values, onChange, {
    deferParentSync,
    onDraftChange,
  });
  const apiRef = useRef({
    flush: flushPending,
    getValues,
    syncParent,
    patchImmediate,
    replaceAll,
  });
  apiRef.current = {
    flush: flushPending,
    getValues,
    syncParent,
    patchImmediate,
    replaceAll,
  };
  if (formApiRef) formApiRef.current = apiRef.current;
  const set = (key, val) => patch({ [key]: val });
  const textBlur = flushPending;

  const ai = useMemo(
    () => resolveChannelAiDefaults(formValues, "insta"),
    [
      formValues.brandName,
      formValues.region,
      formValues.topic,
      formValues.instaPurposeQuestion,
      formValues.instaMoodQuestion,
    ]
  );

  const applyPurpose = (purpose) => {
    const resolved = resolveChannelAiDefaults(
      { ...formValues, instaPurposeQuestion: purpose },
      "insta"
    );
    patchImmediate({ instaPurposeQuestion: purpose, ...resolved.fields });
    if (resolved.fields.instaTone) setTone?.(resolved.fields.instaTone);
  };

  const applyMood = (mood) => {
    const resolved = resolveChannelAiDefaults(
      { ...formValues, instaMoodQuestion: mood },
      "insta"
    );
    patchImmediate({ instaMoodQuestion: mood, ...resolved.fields });
    if (resolved.fields.instaTone) setTone?.(resolved.fields.instaTone);
  };

  useEffect(() => {
    const needs =
      !formValues.instaPurposeQuestion ||
      !formValues.instaCampaignGoal ||
      !formValues.instaAudience;
    if (!needs) return;
    if (!formValues.brandName?.trim() && !formValues.topic?.trim()) return;
    patchImmediate(ai.fields);
    if (ai.fields.instaTone && !instaTone) setTone?.(ai.fields.instaTone);
  }, [formValues.brandName, formValues.region, formValues.topic]);

  const purpose = formValues.instaPurposeQuestion || ai.purpose;
  const mood = formValues.instaMoodQuestion || ai.mood;

  return (
    <div className={`space-y-3 ${compact ? "space-y-2" : ""}`}>
      <SteppedWriteFields
        values={formValues}
        errors={{}}
        onPatch={(next) => patchImmediate(next)}
        onBlur={textBlur}
        regionInputRef={regionInputRef}
        topicRef={topicRef}
        onRegionCompositionStart={() => {
          regionComposingRef.current = true;
        }}
        onRegionCompositionEnd={() => {
          regionComposingRef.current = false;
        }}
        compact={compact}
      />

      {formValues.brandName?.trim() && formValues.topic?.trim() ? (
        <>
          <ChannelAiRecommendCard channel="insta" card={ai.card} compact={compact} />
          <p className="text-[12px] leading-relaxed text-[#8B95A1]">
            브랜드·지역·주제만 입력하면 캡션 톤·목적·해시태그는 AI가 맞춥니다.
          </p>
        </>
      ) : null}

      <button
        type="button"
        onClick={() => setAdvancedOpen((v) => !v)}
        className="text-[12px] font-medium text-[#8B95A1] hover:text-[#4E5968]"
      >
        {advancedOpen ? "▾ 세부 설정 접기" : "▸ 세부 설정 (AI 추천값 적용됨)"}
      </button>

      {advancedOpen ? (
        <div className="space-y-3 rounded-xl border border-dashed border-[#E8EBED] bg-[#FAFBFC] p-3 md:p-4">
          <ChannelFormSection title="목적·분위기" compact={compact} defaultOpen>
            <ChannelField label="이번 게시물 목적" compact={compact}>
              <OptionGrid
                options={INSTA_PURPOSE_QUESTIONS}
                value={purpose}
                onChange={applyPurpose}
                cols={3}
                compact
              />
            </ChannelField>
            <ChannelField label="분위기" compact={compact}>
              <OptionGrid
                options={INSTA_MOOD_QUESTIONS}
                value={mood}
                onChange={applyMood}
                cols={2}
                compact
              />
            </ChannelField>
          </ChannelFormSection>

          <ChannelFormSection
            title="캠페인·독자"
            compact={compact}
            defaultOpen
          >
            <OptionGrid
              options={INSTA_CAMPAIGN_GOAL_OPTIONS}
              value={formValues.instaCampaignGoal || ai.fields.instaCampaignGoal}
              onChange={(v) => set("instaCampaignGoal", v)}
            />
            <ChannelField label="주요 독자">
              <OptionGrid
                options={INSTA_AUDIENCE_OPTIONS}
                value={formValues.instaAudience || ai.fields.instaAudience}
                onChange={(v) => set("instaAudience", v)}
                cols={3}
                compact
              />
            </ChannelField>
            <ChannelField label="후크 각도">
              <OptionGrid
                options={INSTA_HOOK_ANGLE_OPTIONS}
                value={formValues.instaHookAngle || ai.fields.instaHookAngle}
                onChange={(v) => set("instaHookAngle", v)}
                cols={2}
                compact
              />
            </ChannelField>
          </ChannelFormSection>

          <ChannelFormSection title="포맷·분량" compact={compact} defaultOpen>
            <OptionGrid
              options={INSTA_FORMAT_OPTIONS}
              value={formValues.instaFormat || ai.fields.instaFormat}
              onChange={(v) => set("instaFormat", v)}
            />
            <OptionGrid
              options={INSTA_BODY_LENGTH_OPTIONS}
              value={formValues.instaBodyLength || ai.fields.instaBodyLength}
              onChange={(v) => set("instaBodyLength", v)}
              cols={3}
              compact
            />
          </ChannelFormSection>

          <ChannelFormSection title="톤·이모지·해시태그" compact={compact} defaultOpen>
            <ChannelField label="캡션 톤">
              <div className="grid grid-cols-2 gap-1.5">
                {INSTA_TONE_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setTone?.(o.value)}
                    className={`min-h-[40px] rounded-lg border px-2 py-2 text-[12px] font-medium ${
                      (instaTone || ai.fields.instaTone) === o.value
                        ? "border-[#03C75A] bg-[#E8F9EF] text-[#03A94D]"
                        : "border-[#E8EBED] bg-white text-[#4E5968]"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </ChannelField>
            <OptionGrid
              options={INSTA_EMOJI_LEVEL_OPTIONS}
              value={formValues.instaEmojiLevel || ai.fields.instaEmojiLevel || INSTA_EMOJI_LEVEL_DEFAULT}
              onChange={(v) => set("instaEmojiLevel", v)}
              cols={3}
              compact
            />
            <OptionGrid
              options={INSTA_HASHTAG_MODE_OPTIONS}
              value={formValues.instaHashtagMode || "auto"}
              onChange={(v) => set("instaHashtagMode", v)}
            />
            <div className="flex flex-wrap gap-1.5">
              {INSTA_HASHTAG_COUNT_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => set("instaHashtagCount", o.value)}
                  className={`min-h-[36px] rounded-lg border px-2.5 py-1.5 text-[12px] font-medium ${
                    Number(formValues.instaHashtagCount ?? 5) === o.value
                      ? "border-[#03C75A] bg-[#E8F9EF] text-[#03A94D]"
                      : "border-[#E8EBED] bg-white text-[#4E5968]"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </ChannelFormSection>

          <ChannelField label="마무리 CTA (선택)">
            <input
              className={channelFieldClass}
              value={formValues.instaCta || ai.fields.instaCta || ""}
              onChange={(e) => set("instaCta", e.target.value)}
              placeholder="예: 프로필 링크에서 메뉴 보기"
            />
          </ChannelField>
        </div>
      ) : null}
    </div>
  );
}
