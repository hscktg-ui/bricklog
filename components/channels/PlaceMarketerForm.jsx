"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useBufferedObjectPatch } from "@/lib/hooks/useBufferedObjectPatch";
import { useWorkspaceCompact } from "@/hooks/useWorkspaceCompact";
import { CONTENT_KPI_OPTIONS } from "@/lib/constants";
import {
  PLACE_GOAL_OPTIONS,
  PLACE_CTA_OPTIONS,
  PLACE_TONE_OPTIONS,
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
  PLACE_NOTICE_KIND_OPTIONS,
  resolveChannelAiDefaults,
} from "@/lib/product/channelAiDefaults";
import { isDeferFormUntilCommit } from "@/lib/config/productFlags";

/**
 * 플레이스 — 오늘 고객에게 꼭 알릴 내용 중심
 */
export default function PlaceMarketerForm({
  values,
  onChange,
  onDraftChange,
  formApiRef,
  compact: compactProp,
  deferParentSync = isDeferFormUntilCommit(),
}) {
  const composingRef = useRef(false);
  const regionInputRef = useRef(null);
  const topicRef = useRef(null);
  const regionComposingRef = useRef(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const { compact: compactViewport } = useWorkspaceCompact();
  const compact = compactProp ?? compactViewport;
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
    () => resolveChannelAiDefaults(formValues, "place"),
    [
      formValues.brandName,
      formValues.region,
      formValues.topic,
      formValues.placeNoticeKind,
    ]
  );

  const notice = formValues.placeNoticeKind || ai.notice;

  const applyNotice = (kind) => {
    const resolved = resolveChannelAiDefaults(
      { ...formValues, placeNoticeKind: kind },
      "place"
    );
    patchImmediate({ placeNoticeKind: kind, ...resolved.fields });
  };

  useEffect(() => {
    if (formValues.placeNoticeKind && formValues.placeGoal) return;
    if (!formValues.brandName?.trim() && !formValues.topic?.trim()) return;
    patchImmediate(ai.fields);
  }, [formValues.brandName, formValues.region, formValues.topic]);

  const syncTopicFields = (topic) => {
    patchImmediate({
      topic,
      placeHeadline: formValues.placeHeadline?.trim() || topic,
      mainKeyword: formValues.mainKeyword?.trim() || topic.split(/[,，]/)[0]?.trim(),
    });
  };

  const showPeriod = notice === "event" || notice === "ops";
  const showOffer = notice === "event" || notice === "newProduct";

  return (
    <div className={`space-y-3 ${compact ? "space-y-2" : ""}`}>
      <SteppedWriteFields
        values={formValues}
        errors={{}}
        onPatch={(next) => {
          const topic = next.topic ?? formValues.topic;
          patchImmediate({
            ...next,
            placeHeadline: next.placeHeadline || topic,
          });
        }}
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
          <ChannelAiRecommendCard channel="place" card={ai.card} compact={compact} />
          <p className="text-[12px] leading-relaxed text-[#8B95A1]">
            브랜드·지역·주제만 입력하면 공지 유형·톤·CTA는 AI가 추천합니다.
          </p>
        </>
      ) : null}

      <div className="space-y-3 rounded-xl border border-[#E8EBED] bg-white p-3 md:p-4">
        <p className="text-[13px] font-semibold text-[#191F28]">
          오늘 고객에게 꼭 알릴 한 줄
        </p>

        <ChannelField label="공지 한 줄" required compact={compact}>
          <input
            className={channelFieldClass}
            value={formValues.placeHeadline || formValues.topic || ""}
            onCompositionStart={() => {
              composingRef.current = true;
            }}
            onCompositionEnd={(e) => {
              composingRef.current = false;
              syncTopicFields(e.target.value);
            }}
            onChange={(e) => syncTopicFields(e.target.value)}
            placeholder="예: 5월 연휴 휴무 · 신메뉴 입고"
          />
        </ChannelField>

        {showPeriod ? (
          <ChannelField label="기간·일정" compact={compact}>
            <input
              className={channelFieldClass}
              value={formValues.placePeriod || ""}
              onChange={(e) => set("placePeriod", e.target.value)}
              placeholder="예: 5/1~5/5 휴무, 이후 정상 영업"
            />
          </ChannelField>
        ) : null}

        {showOffer ? (
          <ChannelField label="혜택·구성" compact={compact}>
            <input
              className={channelFieldClass}
              value={formValues.placeOffer || ""}
              onChange={(e) => set("placeOffer", e.target.value)}
              placeholder="예: 주말 한정 10% · 2인 세트 증정"
            />
          </ChannelField>
        ) : null}

        <ChannelField
          label={notice === "reserve" ? "예약·문의 방법" : "상세 안내"}
          compact={compact}
        >
          <textarea
            className={`${channelFieldClass} min-h-[72px] resize-y`}
            value={formValues.placeKeyFacts || formValues.placeDetailHint || ""}
            onChange={(e) => {
              const v = e.target.value;
              patch({ placeKeyFacts: v, placeDetailHint: v });
            }}
            placeholder={
              notice === "reserve"
                ? "예약 링크, 전화, 준비물"
                : "영업 시간, 주차, 변경 사항"
            }
          />
        </ChannelField>
      </div>

      <button
        type="button"
        onClick={() => setAdvancedOpen((v) => !v)}
        className="text-[12px] font-medium text-[#8B95A1] hover:text-[#4E5968]"
      >
        {advancedOpen ? "▾ 세부 설정 접기" : "▸ 세부 설정 (AI 추천값 적용됨)"}
      </button>

      {advancedOpen ? (
        <div className="space-y-3 rounded-xl border border-dashed border-[#E8EBED] bg-[#FAFBFC] p-3 md:p-4">
          <ChannelFormSection title="공지 유형" compact={compact} defaultOpen>
            <OptionGrid
              options={PLACE_NOTICE_KIND_OPTIONS}
              value={notice}
              onChange={applyNotice}
              cols={3}
              compact
            />
          </ChannelFormSection>

          <ChannelFormSection title="목표·CTA" compact={compact} defaultOpen>
            <OptionGrid
              options={PLACE_GOAL_OPTIONS}
              value={formValues.placeGoal || ai.fields.placeGoal}
              onChange={(v) => set("placeGoal", v)}
            />
            <OptionGrid
              options={PLACE_CTA_OPTIONS}
              value={formValues.placeCtaType || ai.fields.placeCtaType}
              onChange={(v) => set("placeCtaType", v)}
              cols={2}
              compact
            />
            <ChannelField label="성과 지표 (내부용)" compact={compact}>
              <select
                className={channelFieldClass}
                value={formValues.kpiGoal || ai.fields.kpiGoal}
                onChange={(e) => set("kpiGoal", e.target.value)}
              >
                {CONTENT_KPI_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </ChannelField>
          </ChannelFormSection>

          <ChannelFormSection title="연락·위치·말투" compact={compact} defaultOpen>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "includePhone", label: "전화" },
                { key: "includeHours", label: "영업시간" },
                { key: "includeAddress", label: "주소" },
                { key: "includeParking", label: "주차" },
              ].map(({ key, label }) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#E8EBED] bg-white px-2.5 py-1.5 text-[12px] text-[#4E5968]"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(formValues[key])}
                    onChange={(e) => set(key, e.target.checked)}
                    className="accent-[#03C75A]"
                  />
                  {label}
                </label>
              ))}
            </div>
            <OptionGrid
              options={PLACE_TONE_OPTIONS}
              value={formValues.placeTone || ai.fields.placeTone}
              onChange={(v) => set("placeTone", v)}
              cols={2}
              compact
            />
          </ChannelFormSection>
        </div>
      ) : null}
    </div>
  );
}
