"use client";

import { useRef } from "react";
import { useBufferedObjectPatch } from "@/lib/hooks/useBufferedObjectPatch";
import { useWorkspaceCompact } from "@/hooks/useWorkspaceCompact";
import {
  PLACE_POST_TYPE_OPTIONS,
  CONTENT_KPI_OPTIONS,
} from "@/lib/constants";
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
import { isDeferFormUntilCommit } from "@/lib/config/productFlags";

/**
 * 플레이스 마케터 브리프 — 공지 1건 = 메시지 1개
 */
export default function PlaceMarketerForm({
  values,
  onChange,
  onDraftChange,
  formApiRef,
  compact: compactProp,
  deferParentSync = isDeferFormUntilCommit(),
}) {
  const HANGUL_JAMO_ONLY_RE = /^[\u3131-\u318E\u1100-\u11FF\uA960-\uA97F\uD7B0-\uD7FF]+$/;
  const isMeaningfulKeyword = (value) => {
    const v = String(value || "").trim();
    if (!v) return false;
    if (HANGUL_JAMO_ONLY_RE.test(v)) return false;
    return true;
  };
  const composingRef = useRef(false);
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

  const syncTopic = (headline) => {
    const candidate = headline.split(/[,，]/)[0]?.trim();
    const derivedKeyword = isMeaningfulKeyword(candidate) ? candidate : "";
    const currentMain = String(formValues.mainKeyword || "").trim();
    patch({
      placeHeadline: headline,
      topic: formValues.topic?.trim() || headline,
      mainKeyword:
        (isMeaningfulKeyword(currentMain) && currentMain) || derivedKeyword,
    });
  };

  return (
    <div className={`space-y-3 ${compact ? "space-y-2" : ""}`}>
      {!compact && (
        <p className="text-[11px] leading-relaxed text-[#8B95A1]">
          블로그처럼 <strong className="font-medium text-[#4E5968]">무엇을·누구에게·어떤 행동</strong>
          을 원하는지 정한 뒤 만들면, 막연한 문장이 아닌{" "}
          <strong className="font-medium text-[#03A94D]">공지형 카피</strong>가 나옵니다.
        </p>
      )}

      <ChannelFormSection
        title="1. 이번 공지의 목표"
        desc="한 번에 메시지 하나만 전합니다. 목표가 겹치면 독자가 헷갈립니다."
        compact={compact}
        defaultOpen
      >
        <OptionGrid
          options={PLACE_GOAL_OPTIONS}
          value={formValues.placeGoal || "visit"}
          onChange={(v) => set("placeGoal", v)}
        />
        <ChannelField
          label="성과 지표 (선택)"
          hint="내부 기준용 — 문장에 그대로 넣지 않아요"
          compact={compact}
        >
          <select
            className={channelFieldClass}
            value={formValues.kpiGoal || "reservation"}
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

      <ChannelFormSection
        title="2. 게시 유형"
        desc="플레이스·네이버 사장님 공지 톤에 맞는 구조를 잡습니다."
        compact={compact}
        defaultOpen={!compact}
      >
        <OptionGrid
          options={PLACE_POST_TYPE_OPTIONS}
          value={formValues.placePostType || "general"}
          onChange={(v) => set("placePostType", v)}
          cols={2}
          compact
        />
      </ChannelFormSection>

      <ChannelFormSection
        title="3. 핵심 한 줄"
        desc="스마트폰 알림·목록에서 보이는 제목입니다."
        compact={compact}
        defaultOpen
      >
        <ChannelField label="공지 제목" required>
          <input
            className={channelFieldClass}
            value={formValues.placeHeadline || formValues.topic || ""}
            onCompositionStart={() => {
              composingRef.current = true;
            }}
            onCompositionEnd={(e) => {
              composingRef.current = false;
              syncTopic(e.target.value);
            }}
            onChange={(e) => syncTopic(e.target.value)}
            placeholder="예: 5월 연휴 휴무 안내 · 신메뉴 입고"
          />
        </ChannelField>
      </ChannelFormSection>

      <ChannelFormSection
        title="4. 고객이 꼭 알아야 할 사실"
        desc="일정·혜택·변경 사항만 적어 주세요. 장황한 스토리는 이야기 탭에서."
        compact={compact}
        defaultOpen={!compact}
      >
        <ChannelField label="기간·일정">
          <input
            className={channelFieldClass}
            value={formValues.placePeriod || ""}
            onChange={(e) => set("placePeriod", e.target.value)}
            placeholder="예: 5/1(목)~5/5(월) 휴무, 이후 정상 영업"
          />
        </ChannelField>
        <ChannelField label="혜택·구성 (선택)">
          <input
            className={channelFieldClass}
            value={formValues.placeOffer || ""}
            onChange={(e) => set("placeOffer", e.target.value)}
            placeholder="예: 주말 한정 10% · 2인 세트 증정"
          />
        </ChannelField>
        <ChannelField label="상세 안내">
          <textarea
            className={`${channelFieldClass} min-h-[80px] resize-y`}
            value={formValues.placeKeyFacts || formValues.placeDetailHint || ""}
            onChange={(e) => {
              const v = e.target.value;
              onChange({
                ...values,
                placeKeyFacts: v,
                placeDetailHint: v,
              });
            }}
            placeholder="영업 시간 변경, 주차, 예약 방법, 준비물 등"
          />
        </ChannelField>
      </ChannelFormSection>

      <ChannelFormSection
        title="5. 고객 행동 (CTA)"
        desc="읽은 뒤 무엇을 하면 좋은지 한 가지로 안내합니다."
        compact={compact}
        defaultOpen={!compact}
      >
        <OptionGrid
          options={PLACE_CTA_OPTIONS}
          value={formValues.placeCtaType || "visit"}
          onChange={(v) => set("placeCtaType", v)}
          cols={2}
          compact
        />
        {(formValues.placeCtaType || "visit") === "custom" && (
          <ChannelField label="CTA 문구">
            <input
              className={channelFieldClass}
              value={formValues.placeCtaNote || ""}
              onChange={(e) => set("placeCtaNote", e.target.value)}
              placeholder="예: 네이버 예약 또는 DM으로 문의"
            />
          </ChannelField>
        )}
      </ChannelFormSection>

      <ChannelFormSection
        title="6. 본문에 넣을 연락·위치"
        desc="체크한 항목만 문장에 반영합니다. 없는 정보는 넣지 않아요."
        compact={compact}
        defaultOpen={!compact}
      >
        <div className="flex flex-wrap gap-2">
          {[
            { key: "includePhone", label: "전화" },
            { key: "includeHours", label: "영업시간" },
            { key: "includeAddress", label: "주소·찾아오기" },
            { key: "includeParking", label: "주차" },
          ].map(({ key, label }) => (
            <label
              key={key}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#E8EBED] bg-white px-2.5 py-1.5 text-[12px] text-[#4E5968]"
            >
              <input
                type="checkbox"
                checked={Boolean(values[key])}
                onChange={(e) => set(key, e.target.checked)}
                className="accent-[#03C75A]"
              />
              {label}
            </label>
          ))}
        </div>
        <ChannelField label="말투">
          <OptionGrid
            options={PLACE_TONE_OPTIONS}
            value={formValues.placeTone || "informative"}
            onChange={(v) => set("placeTone", v)}
            cols={2}
            compact
          />
        </ChannelField>
      </ChannelFormSection>
    </div>
  );
}
