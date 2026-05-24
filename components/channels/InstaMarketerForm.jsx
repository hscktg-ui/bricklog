"use client";

import { useRef } from "react";
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
  const {
    values: formValues,
    patch,
    patchImmediate,
    flushPending,
    syncParent,
    getValues,
    replaceAll,
  } =
    useBufferedObjectPatch(values, onChange, {
      deferParentSync,
      onDraftChange,
    });
  const apiRef = useRef({
    flush: flushPending,
    getValues,
    syncParent,
    patchImmediate,
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

  return (
    <div className={`space-y-3 ${compact ? "space-y-2" : ""}`}>
      {!compact && (
        <p className="text-[11px] leading-relaxed text-[#8B95A1]">
          저장·방문·DM 등 <strong className="font-medium text-[#4E5968]">캠페인 목표</strong>
          를 먼저 정하면, 맹목적인 해시태그 나열이 아니라{" "}
          <strong className="font-medium text-[#03A94D]">피드에 맞는 캡션</strong>이 나옵니다.
        </p>
      )}

      <ChannelFormSection
        title="1. 캠페인 목표"
        desc="이번 게시물로 무엇을 얻고 싶은지 정합니다."
        compact={compact}
        defaultOpen={!compact}
      >
        <OptionGrid
          options={INSTA_CAMPAIGN_GOAL_OPTIONS}
          value={formValues.instaCampaignGoal || "save"}
          onChange={(v) => set("instaCampaignGoal", v)}
        />
        <ChannelField label="주요 독자">
          <OptionGrid
            options={INSTA_AUDIENCE_OPTIONS}
            value={formValues.instaAudience || "local"}
            onChange={(v) => set("instaAudience", v)}
            cols={3}
            compact
          />
        </ChannelField>
      </ChannelFormSection>

      <ChannelFormSection
        title="2. 소재·후크"
        desc="첫 줄에서 멈추게 할 장면·각도입니다."
        compact={compact}
        defaultOpen
      >
        <ChannelField label="오늘의 소재" required>
          <input
            className={channelFieldClass}
            value={formValues.topic || ""}
            onChange={(e) => {
              const topic = e.target.value;
              patch({
                topic,
                mainKeyword:
                  formValues.mainKeyword?.trim() ||
                  topic.split(/[,，]/)[0]?.trim(),
              });
            }}
            placeholder="예: 비 오는 날 디저트 · 봄 시즌 꽃다발"
          />
        </ChannelField>
        <ChannelField label="후크 각도">
          <OptionGrid
            options={INSTA_HOOK_ANGLE_OPTIONS}
            value={formValues.instaHookAngle || "emotional"}
            onChange={(v) => set("instaHookAngle", v)}
            cols={2}
            compact
          />
        </ChannelField>
        <ChannelField
          label="장면 한 줄 (선택)"
          hint="비우면 브랜드·업종에 맞게 자동"
          compact={compact}
        >
          <input
            className={channelFieldClass}
            value={formValues.instaScene || ""}
            onChange={(e) => set("instaScene", e.target.value)}
            placeholder="예: 퇴근길에 들러 가져가기 좋은 날"
          />
        </ChannelField>
      </ChannelFormSection>

      <ChannelFormSection
        title="3. 포맷·분량"
        desc="릴스/숏폼은 더 짧게 잡습니다."
        compact={compact}
        defaultOpen={!compact}
      >
        <OptionGrid
          options={INSTA_FORMAT_OPTIONS}
          value={formValues.instaFormat || "feed"}
          onChange={(v) => set("instaFormat", v)}
        />
        <OptionGrid
          options={INSTA_BODY_LENGTH_OPTIONS}
          value={formValues.instaBodyLength || "medium"}
          onChange={(v) => set("instaBodyLength", v)}
          cols={3}
          compact
        />
      </ChannelFormSection>

      <ChannelFormSection
        title="4. 톤·이모지"
        compact={compact}
        defaultOpen={!compact}
      >
        <ChannelField label="캡션 톤">
          <div className="grid grid-cols-2 gap-1.5">
            {INSTA_TONE_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setTone?.(o.value)}
                className={`min-h-[40px] rounded-lg border px-2 py-2 text-[12px] font-medium ${
                  instaTone === o.value
                    ? "border-[#03C75A] bg-[#E8F9EF] text-[#03A94D]"
                    : "border-[#E8EBED] bg-white text-[#4E5968]"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </ChannelField>
        <ChannelField
          label="이모지"
          hint="기본값은 적절히 — 후크·마무리에 자연스럽게 넣어요"
          compact={compact}
        >
          <OptionGrid
            options={INSTA_EMOJI_LEVEL_OPTIONS}
            value={formValues.instaEmojiLevel || INSTA_EMOJI_LEVEL_DEFAULT}
            onChange={(v) => set("instaEmojiLevel", v)}
            cols={3}
            compact
          />
        </ChannelField>
      </ChannelFormSection>

      <ChannelFormSection
        title="5. 해시태그"
        desc="최대 5개 · 브랜드·지역 기반 추천"
        compact={compact}
        defaultOpen={!compact}
      >
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
        <OptionGrid
          options={INSTA_HASHTAG_MODE_OPTIONS}
          value={formValues.instaHashtagMode || "auto"}
          onChange={(v) => set("instaHashtagMode", v)}
        />
        {(formValues.instaHashtagMode || "auto") === "manual" && (
          <textarea
            className={`${channelFieldClass} min-h-[64px] resize-y text-[13px]`}
            value={formValues.instaManualHashtags || ""}
            onChange={(e) => set("instaManualHashtags", e.target.value)}
            placeholder="#태그1 #태그2"
          />
        )}
      </ChannelFormSection>

      <ChannelFormSection
        title="6. 마무리 CTA·피할 표현"
        desc="댓글·DM·프로필 링크 등 부드러운 행동 유도"
        compact={compact}
        defaultOpen={!compact}
      >
        <ChannelField label="마무리 한 줄 (선택)">
          <input
            className={channelFieldClass}
            value={formValues.instaCta || ""}
            onChange={(e) => set("instaCta", e.target.value)}
            placeholder="예: 프로필 링크에서 메뉴 보기 · DM으로 예약"
          />
        </ChannelField>
        <ChannelField label="쓰지 말아야 할 말 (선택)">
          <input
            className={channelFieldClass}
            value={formValues.instaExcludePhrases || formValues.excludePhrases || ""}
            onChange={(e) => {
              const v = e.target.value;
              patch({ instaExcludePhrases: v, excludePhrases: v });
            }}
            placeholder="예: 최고, 1등, 무조건"
          />
        </ChannelField>
      </ChannelFormSection>
    </div>
  );
}
