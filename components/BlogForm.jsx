"use client";

import { memo, useEffect, useMemo, useRef } from "react";
import { useBufferedObjectPatch } from "@/lib/hooks/useBufferedObjectPatch";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import {
  BLOG_PURPOSE_OPTIONS,
  BLOG_TONE_OPTIONS,
  BLOG_LENGTH_TIER_OPTIONS,
  CONTENT_KPI_OPTIONS,
  CONTENT_OBJECTIVE_OPTIONS,
} from "@/lib/constants";
import { getKpiModifier } from "@/lib/kpi/contentGoals";
import { EMOJI_DENSITY_OPTIONS } from "@/lib/emoji/emojiDensityEngine";
import { BRAND_TYPE_OPTIONS } from "@/lib/constants";
import LocationIntelPanel from "@/components/LocationIntelPanel";
import IndustryInput from "@/components/IndustryInput";
import {
  CONTENT_PERSONA_OPTIONS,
  resolveContentPersona,
} from "@/lib/persona/contentPersona";
import { V4_SPEAKER_OPTIONS } from "@/lib/persona/v4Speakers";
import { EMOTION_TEMPERATURE_OPTIONS } from "@/lib/emotion/emotionTemperature";
import {
  SPEECH_STYLE_OPTIONS,
  PROFICIENCY_OPTIONS,
} from "@/lib/constitution/writingConstitutionV2";
import { resolveSensitiveCompliance } from "@/lib/compliance/sensitiveCategories";
import ResearchModePanel from "@/components/research/ResearchModePanel";
import WriteFlowSteps from "@/components/product/WriteFlowSteps";
import { isDeferFormUntilCommit } from "@/lib/config/productFlags";

const fieldClass =
  "w-full rounded-lg border border-[#E8EBED] bg-white px-3 py-2.5 text-[14px] text-[#191F28] placeholder:text-[#B0B8C1] focus:border-[#03C75A] focus:outline-none focus:ring-2 focus:ring-[#03C75A]/15";

function Field({ label, error, children, required }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1 text-[13px] font-medium text-[#4E5968]">
        {label}
        {required && <span className="text-[#03C75A]">*</span>}
      </span>
      {children}
      {error && (
        <p className="mt-1 text-[12px] text-[#E67700]">{error}</p>
      )}
    </label>
  );
}

function BlogForm({
  values,
  errors = {},
  onChange,
  onDraftChange,
  formApiRef,
  advancedOpen,
  onAdvancedToggle,
  compact = false,
  simpleMode = false,
  deferParentSync = isDeferFormUntilCommit(),
}) {
  const pauseFlushRef = useRef(false);
  const regionComposingRef = useRef(false);
  const regionInputRef = useRef(null);
  const topicAutoFocusedRef = useRef(false);
  const {
    values: formValues,
    patch,
    patchImmediate,
    flushPending,
    clearPendingFlush,
    getValues,
    syncParent,
    replaceAll,
  } = useBufferedObjectPatch(values, onChange, {
    onDraftChange,
    pauseFlushRef,
    deferParentSync,
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
  const topicRef = useRef(null);

  useEffect(() => {
    if (!formValues.region?.trim()) {
      topicAutoFocusedRef.current = false;
    }
  }, [formValues.region]);

  useEffect(() => {
    if (compact) return;
    if (regionComposingRef.current) return;
    if (document.activeElement === regionInputRef.current) return;
    const ready =
      formValues.brandName?.trim() &&
      formValues.region?.trim() &&
      !formValues.topic?.trim();
    if (!ready || topicAutoFocusedRef.current) return;
    const t = window.setTimeout(() => {
      if (regionComposingRef.current) return;
      if (document.activeElement === regionInputRef.current) return;
      topicAutoFocusedRef.current = true;
      topicRef.current?.focus();
    }, 120);
    return () => window.clearTimeout(t);
  }, [
    compact,
    formValues.brandName,
    formValues.region,
    formValues.topic,
  ]);

  const onRegionCompositionStart = () => {
    regionComposingRef.current = true;
    pauseFlushRef.current = true;
    clearPendingFlush();
  };

  const onRegionCompositionEnd = () => {
    regionComposingRef.current = false;
    pauseFlushRef.current = false;
    flushPending();
  };

  const personaDef = CONTENT_PERSONA_OPTIONS.find(
    (o) => o.value === (formValues.contentPersona || "auto")
  );
  const debouncedIndustry = useDebouncedValue(formValues.industry || "", 280);
  const debouncedTopic = useDebouncedValue(formValues.topic || "", 280);
  const debouncedMainKeyword = useDebouncedValue(formValues.mainKeyword || "", 280);

  const sensitive = useMemo(
    () =>
      resolveSensitiveCompliance({
        brandType: formValues.brandType,
        industry: debouncedIndustry,
        industryText: debouncedIndustry,
        topic: debouncedTopic,
        mainKeyword: debouncedMainKeyword,
      }),
    [
      formValues.brandType,
      debouncedIndustry,
      debouncedTopic,
      debouncedMainKeyword,
    ]
  );

  const resolved =
    formValues.contentPersona === "auto"
      ? resolveContentPersona({
          contentPersona: "auto",
          topic: formValues.topic,
          purpose: formValues.purpose,
          includePhrases: formValues.includePhrases,
          mainKeyword: formValues.mainKeyword,
          region: formValues.region,
          brandName: formValues.brandName,
          contentObjective: formValues.contentObjective,
        })
      : null;

  const optionalFields = (
    <>
      <Field label="브랜드 유형">
        <select
          className={fieldClass}
          value={formValues.brandType || "other"}
          onChange={(e) => set("brandType", e.target.value)}
        >
          {BRAND_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {!compact && (
          <p className="mt-1 text-[11px] text-[#8B95A1]">
            {BRAND_TYPE_OPTIONS.find((o) => o.value === (formValues.brandType || "other"))
              ?.hint || "어떤 브랜드든 사용할 수 있습니다"}
          </p>
        )}
      </Field>

      <Field label="업종 (선택)">
        <IndustryInput
          value={formValues.industry || ""}
          onChange={(v) => patchImmediate({ industry: v })}
        />
        {!compact && (
          <p className="mt-1 text-[11px] text-[#8B95A1]">
            칩을 누르거나 직접 입력하세요. 비워 두어도 글을 쓸 수 있어요.
          </p>
        )}
        {sensitive.isSensitive && (
          <p className="mt-2 inline-flex items-center gap-1 rounded-md border border-[#FFE0B2] bg-[#FFF8E6] px-2 py-1 text-[11px] font-semibold text-[#E67700]">
            ⚖️ {sensitive.userBadge}
          </p>
        )}
      </Field>

      <Field label="글 분량">
        <div className="grid grid-cols-3 gap-2">
          {BLOG_LENGTH_TIER_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => set("blogLengthTier", o.value)}
              className={`briclog-pressable min-h-[44px] rounded-lg border px-2 py-2 text-left ${
                (formValues.blogLengthTier || "medium") === o.value
                  ? "border-[#03C75A] bg-[#E8F9EF]"
                  : "border-[#E8EBED] bg-white"
              }`}
            >
              <span className="block text-[13px] font-semibold text-[#191F28]">
                {o.label}
              </span>
              {!compact && (
                <span className="mt-0.5 block text-[10px] text-[#8B95A1]">
                  {o.hint}
                </span>
              )}
            </button>
          ))}
        </div>
      </Field>
    </>
  );

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <WriteFlowSteps values={formValues} />
      {!compact && (
        <p className="text-[11px] text-[#8B95A1] leading-snug">
          소제목·문단 순서는 직접 지정하지 않아도 됩니다. 톤과 소재만 알려 주세요.
        </p>
      )}
      <Field label="브랜드명" required error={errors.brandName}>
        <input
          className={fieldClass}
          value={formValues.brandName}
          onChange={(e) => set("brandName", e.target.value)}
          onBlur={textBlur}
          placeholder="매장·브랜드·팀 이름"
        />
      </Field>

      {compact ? (
        <details className="rounded-xl border border-[#E8EBED] bg-[#FAFBFC]">
          <summary className="briclog-no-slab flex min-h-[44px] cursor-pointer list-none items-center justify-between px-3.5 py-3 text-[13px] font-semibold text-[#4E5968] marker:content-none [&::-webkit-details-marker]:hidden">
            업종·분량 등 (선택)
            <span className="text-[11px] font-normal text-[#8B95A1]">펼치기</span>
          </summary>
          <div className="space-y-3 border-t border-[#E8EBED] px-3.5 pb-3.5 pt-3">
            {optionalFields}
          </div>
        </details>
      ) : (
        optionalFields
      )}

      <Field label="지역" required error={errors.region}>
        <input
          ref={regionInputRef}
          className={fieldClass}
          value={formValues.region}
          onChange={(e) => set("region", e.target.value)}
          onCompositionStart={onRegionCompositionStart}
          onCompositionEnd={onRegionCompositionEnd}
          onBlur={textBlur}
          placeholder="예: 서울 마포"
        />
      </Field>

      <Field label="오늘의 주제" required error={errors.topic}>
        <textarea
          ref={topicRef}
          className={`${fieldClass} ${compact ? "min-h-[56px]" : "min-h-[72px]"} resize-y`}
          value={formValues.topic || ""}
          onChange={(e) => {
            const topic = e.target.value;
            patch({
              topic,
              mainKeyword:
                formValues.mainKeyword || topic.split(/[,，]/)[0]?.trim(),
            });
          }}
          onBlur={textBlur}
          placeholder="오늘 전하고 싶은 이야기, 장면, 감정"
        />
      </Field>

      {!simpleMode && (
        <ResearchModePanel
          compact={compact}
          enabled={Boolean(formValues.researchEnabled)}
          types={formValues.researchTypes || []}
          query={formValues.researchQuery || ""}
          onEnabledChange={(v) => patchImmediate({ researchEnabled: v })}
          onTypesChange={(ids) => patchImmediate({ researchTypes: ids })}
          onQueryChange={(q) => set("researchQuery", q)}
        />
      )}

      {!simpleMode && (
      <button
        type="button"
        onClick={onAdvancedToggle}
        className="text-[12px] font-medium text-[#8B95A1] hover:text-[#4E5968]"
      >
        {advancedOpen
          ? "▾ 세부 설정 접기"
          : compact
            ? "▸ 톤·키워드 등 (선택)"
            : "▸ 세부 설정 (선택)"}
      </button>
      )}

      {!simpleMode && advancedOpen && (
        <div className="rounded-xl border border-dashed border-[#E8EBED] bg-[#FAFBFC] p-4 space-y-3">
          <Field label="화자">
            <select
              className={fieldClass}
              value={formValues.v4Speaker || "auto"}
              onChange={(e) => patchImmediate({ v4Speaker: e.target.value })}
            >
              {V4_SPEAKER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {!compact && (
              <p className="mt-1 text-[11px] text-[#8B95A1]">
                선택하지 않으면 브랜드·주제에 맞게 자동 결정됩니다.
              </p>
            )}
          </Field>
          <Field label="감정">
            <select
              className={fieldClass}
              value={formValues.emotionTemperature || "auto"}
              onChange={(e) =>
                patchImmediate({ emotionTemperature: e.target.value })
              }
            >
              {EMOTION_TEMPERATURE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="문체">
            <select
              className={fieldClass}
              value={formValues.speechStyle || "friendly_blog"}
              onChange={(e) => patchImmediate({ speechStyle: e.target.value })}
            >
              {SPEECH_STYLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {!compact && (
              <p className="mt-1 text-[11px] text-[#8B95A1]">
                화자(누가 말하는지)와 별도로, 문장의 격식·친근함을 맞춥니다.
              </p>
            )}
          </Field>
          <Field label="숙련도 (기본: 전문 에디터)">
            <select
              className={fieldClass}
              value={formValues.proficiency || "editor_pro"}
              onChange={(e) => patchImmediate({ proficiency: e.target.value })}
            >
              {PROFICIENCY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {!compact && (
              <p className="mt-1 text-[11px] text-[#8B95A1]">
                기본값은 전문 에디터 기준으로 다듬습니다.
              </p>
            )}
          </Field>
          <Field label="세부 관점 (고급)">
            <select
              className={fieldClass}
              value={formValues.contentPersona || "auto"}
              onChange={(e) =>
                patchImmediate({
                  contentPersona: e.target.value,
                  contentPersonaSubtype: "",
                })
              }
            >
              {CONTENT_PERSONA_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {!compact && (
              <p className="mt-1 text-[11px] text-[#8B95A1]">
                {personaDef?.desc}
                {resolved?.source === "auto" && resolved?.label && (
                  <span className="text-[#03A94D]">
                    {" "}
                    · 추천: {resolved.label}
                  </span>
                )}
              </p>
            )}
            {personaDef?.subtypes?.length > 0 &&
              formValues.contentPersona &&
              formValues.contentPersona !== "auto" && (
                <select
                  className={`${fieldClass} mt-2`}
                  value={formValues.contentPersonaSubtype || ""}
                  onChange={(e) => set("contentPersonaSubtype", e.target.value)}
                >
                  <option value="">세부 관점 (자동)</option>
                  {personaDef.subtypes.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              )}
          </Field>
          <Field label="메인 키워드" error={errors.mainKeyword}>
            <input
              className={fieldClass}
              value={formValues.mainKeyword}
              onChange={(e) => set("mainKeyword", e.target.value)}
              onBlur={textBlur}
              placeholder="비우면 주제에서 자동"
            />
          </Field>
          <Field label="서브 키워드">
            <input
              className={fieldClass}
              value={formValues.subKeyword}
              onChange={(e) => set("subKeyword", e.target.value)}
              onBlur={textBlur}
              placeholder="쉼표로 구분"
            />
          </Field>
          <Field label="포함할 내용">
            <textarea
              className={`${fieldClass} min-h-[56px] resize-y`}
              value={formValues.includePhrases}
              onChange={(e) => set("includePhrases", e.target.value)}
              onBlur={textBlur}
              placeholder="꼭 넣고 싶은 말"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="글 분위기">
              <select
                className={fieldClass}
                value={formValues.tone}
                onChange={(e) => set("tone", e.target.value)}
              >
                {BLOG_TONE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="글 목적">
              <select
                className={fieldClass}
                value={formValues.purpose}
                onChange={(e) => set("purpose", e.target.value)}
              >
                {BLOG_PURPOSE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="이모지">
            <select
              className={fieldClass}
              value={formValues.emojiDensity || "low"}
              onChange={(e) => set("emojiDensity", e.target.value)}
            >
              {EMOJI_DENSITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <details className="text-[11px] text-[#8B95A1]">
            <summary className="cursor-pointer font-medium text-[#4E5968]">
              매장 정보 (확인된 것만, 선택)
            </summary>
            <div className="mt-2">
              <LocationIntelPanel
                values={formValues}
                onChange={(next) => patchImmediate(next)}
              />
            </div>
          </details>
          <Field label="제외할 표현">
            <textarea
              className={`${fieldClass} min-h-[48px] resize-y`}
              value={formValues.excludePhrases}
              onChange={(e) => set("excludePhrases", e.target.value)}
              onBlur={textBlur}
            />
          </Field>
          <details className="text-[11px] text-[#8B95A1]">
            <summary className="cursor-pointer font-medium text-[#4E5968]">
              운영 세부 (KPI·목표)
            </summary>
            <div className="mt-2 space-y-2">
              <select
                className={fieldClass}
                value={formValues.kpiGoal || "save"}
                onChange={(e) => {
                  const kpi = getKpiModifier(e.target.value);
                  patchImmediate({
                    kpiGoal: e.target.value,
                    purpose: kpi.purpose,
                    tone: kpi.tone,
                  });
                }}
              >
                {CONTENT_KPI_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <select
                className={fieldClass}
                value={formValues.contentObjective || "save"}
                onChange={(e) => set("contentObjective", e.target.value)}
              >
                {CONTENT_OBJECTIVE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

export default memo(BlogForm);
