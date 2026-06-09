"use client";

import { memo, useEffect, useMemo, useRef } from "react";
import { useBufferedObjectPatch } from "@/lib/hooks/useBufferedObjectPatch";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import {
  BLOG_PURPOSE_OPTIONS,
  BLOG_TONE_OPTIONS,
  CONTENT_KPI_OPTIONS,
  CONTENT_OBJECTIVE_OPTIONS,
  CONTENT_PERSPECTIVE_OPTIONS,
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
import { getSpeakerTopicGuidance } from "@/lib/persona/speakerTopicGuide";
import {
  describeLinkedPersona,
  getSpeakerPersonaFields,
  isSpeakerPersonaLocked,
} from "@/lib/persona/syncSpeakerPersona";
import { EMOTION_TEMPERATURE_OPTIONS } from "@/lib/emotion/emotionTemperature";
import { SPEECH_STYLE_OPTIONS } from "@/lib/constitution/writingConstitutionV2";
import {
  WRITING_SKILL_LEVEL_OPTIONS,
  resolveWritingSkillLevel,
} from "@/lib/content/writingSkillLevel";
import { resolveContentPerspective } from "@/lib/content/perspectiveEngine";
import { resolveSensitiveCompliance } from "@/lib/compliance/sensitiveCategories";
import ResearchModePanel from "@/components/research/ResearchModePanel";
import WriteFlowSteps from "@/components/product/WriteFlowSteps";
import {
  getBlogLengthFieldLabel,
  getBlogLengthTierOptionsForUi,
} from "@/lib/product/missionUi";
import { isDeferFormUntilCommit } from "@/lib/config/productFlags";
import { detectBrandIndustryMismatch } from "@/lib/product/brandIndustryMismatch";

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
  mobileSimplified = false,
  deferParentSync = isDeferFormUntilCommit(),
}) {
  const effectiveSimple = simpleMode || mobileSimplified;
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
  const lengthTierOptions = useMemo(() => getBlogLengthTierOptionsForUi(), []);
  const lengthFieldLabel = useMemo(() => getBlogLengthFieldLabel(), []);

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

  const speakerLocked = isSpeakerPersonaLocked(formValues.v4Speaker);
  const linkedPersona = speakerLocked
    ? describeLinkedPersona(formValues.v4Speaker)
    : null;

  const speakerTopicGuide = useMemo(
    () =>
      getSpeakerTopicGuidance({
        topic: formValues.topic,
        mainKeyword: formValues.mainKeyword,
        includePhrases: formValues.includePhrases,
        purpose: formValues.purpose,
        purposeType: formValues.purposeType,
        brandName: formValues.brandName,
        region: formValues.region,
        v4Speaker: formValues.v4Speaker,
      }),
    [
      formValues.topic,
      formValues.mainKeyword,
      formValues.includePhrases,
      formValues.purpose,
      formValues.purposeType,
      formValues.brandName,
      formValues.region,
      formValues.v4Speaker,
    ]
  );

  const brandIndustryMismatch = useMemo(
    () =>
      detectBrandIndustryMismatch({
        brandName: formValues.brandName,
        topic: debouncedTopic,
        mainKeyword: debouncedMainKeyword,
        industry: debouncedIndustry,
      }),
    [
      formValues.brandName,
      debouncedTopic,
      debouncedMainKeyword,
      debouncedIndustry,
    ]
  );

  const resolvedPerspective =
    formValues.contentPerspective === "auto"
      ? resolveContentPerspective({
          contentPerspective: "auto",
          topic: formValues.topic,
          purpose: formValues.purpose,
          includePhrases: formValues.includePhrases,
          mainKeyword: formValues.mainKeyword,
          contentObjective: formValues.contentObjective,
          tone: formValues.tone,
          competitors: formValues.competitors,
          brandName: formValues.brandName,
          region: formValues.region,
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
        {brandIndustryMismatch.mismatch && (
          <p
            className="mt-2 rounded-lg border border-[#FFE0B2] bg-[#FFF8E6] px-3 py-2 text-[12px] leading-relaxed text-[#4E5968]"
            role="status"
          >
            <span className="font-semibold text-[#E67700]">업종 확인</span>
            <span className="mt-1 block">{brandIndustryMismatch.message}</span>
          </p>
        )}
      </Field>

      <Field label={lengthFieldLabel}>
        <div className="grid grid-cols-3 gap-2">
          {lengthTierOptions.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => set("blogLengthTier", o.value)}
              className={`briclog-pressable min-h-[44px] rounded-lg border px-2 py-2 text-left ${
                (formValues.blogLengthTier || "short") === o.value
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

      <Field label="콘텐츠 관점">
        <select
          className={fieldClass}
          value={formValues.contentPerspective || "auto"}
          onChange={(e) => set("contentPerspective", e.target.value)}
        >
          {CONTENT_PERSPECTIVE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {!compact && (
          <p className="mt-1 text-[11px] text-[#8B95A1]">
            {CONTENT_PERSPECTIVE_OPTIONS.find(
              (o) => o.value === (formValues.contentPerspective || "auto")
            )?.hint || "글의 시선·구조·톤을 정합니다"}
            {resolvedPerspective?.source === "auto" && resolvedPerspective?.label && (
              <span className="text-[#03A94D]">
                {" "}
                · 추천: {resolvedPerspective.label}
              </span>
            )}
          </p>
        )}
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

      {effectiveSimple && sensitive.isSensitive ? (
        <p className="inline-flex items-center gap-1 rounded-lg border border-[#FFE0B2] bg-[#FFF8E6] px-3 py-2 text-[12px] font-semibold text-[#E67700]">
          ⚖️ {sensitive.userBadge}
        </p>
      ) : null}

      {speakerTopicGuide.kind !== "general" ? (
        <p
          className={`rounded-lg border px-3 py-2.5 text-[12px] leading-relaxed ${
            speakerTopicGuide.alignmentOk
              ? "border-[#E8EBED] bg-[#FAFBFC] text-[#4E5968]"
              : "border-[#FFE0B2] bg-[#FFF8E6] text-[#4E5968]"
          }`}
          role="status"
        >
          <span
            className={`font-semibold ${
              speakerTopicGuide.alignmentOk ? "text-[#03A94D]" : "text-[#E67700]"
            }`}
          >
            {speakerTopicGuide.kind === "visit" ? "방문 후기" : "정보·가이드"}
          </span>
          <span className="mt-1 block">{speakerTopicGuide.message}</span>
        </p>
      ) : null}

      <button
        type="button"
        onClick={onAdvancedToggle}
        className="text-[12px] font-medium text-[#8B95A1] hover:text-[#4E5968]"
      >
        {advancedOpen
          ? "▾ 조사·화자 맞추기 접기"
          : effectiveSimple
            ? "▸ 조사·화자 맞추기"
            : compact
              ? "▸ 더 맞추기 (톤·조사·키워드)"
              : "▸ 더 맞추기 (톤·조사·키워드·분량)"}
      </button>

      {advancedOpen && (
        <div className="rounded-xl border border-dashed border-[#E8EBED] bg-[#FAFBFC] p-4 space-y-3">
          <ResearchModePanel
            compact={compact}
            enabled={Boolean(formValues.researchEnabled)}
            types={formValues.researchTypes || []}
            query={formValues.researchQuery || ""}
            onEnabledChange={(v) => patchImmediate({ researchEnabled: v })}
            onTypesChange={(ids) => patchImmediate({ researchTypes: ids })}
            onQueryChange={(q) => set("researchQuery", q)}
          />
          <Field label="화자">
            <select
              className={fieldClass}
              value={formValues.v4Speaker || "auto"}
              onChange={(e) => {
                const v4Speaker = e.target.value;
                const patch = { v4Speaker };
                const linked = getSpeakerPersonaFields(v4Speaker);
                if (linked) {
                  patch.contentPersona = linked.contentPersona;
                  patch.contentPersonaSubtype = linked.contentPersonaSubtype;
                }
                patchImmediate(patch);
              }}
            >
              {V4_SPEAKER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {!compact && (() => {
              const hint = V4_SPEAKER_OPTIONS.find(
                (o) => o.value === (formValues.v4Speaker || "auto")
              )?.engineHint;
              return (
                <>
                  <p className="mt-1 text-[11px] text-[#8B95A1]">
                    {hint ||
                      "자동 추천 시 주제·브랜드에 맞는 Editor·Humanity·품질 프로필이 적용됩니다."}
                  </p>
                  {speakerTopicGuide.kind !== "general" ? (
                    <p
                      className={`mt-2 rounded-lg border px-3 py-2 text-[12px] leading-relaxed ${
                        speakerTopicGuide.alignmentOk
                          ? "border-[#E8EBED] bg-white text-[#4E5968]"
                          : "border-[#FFE0B2] bg-[#FFF8E6] text-[#4E5968]"
                      }`}
                      role="status"
                    >
                      <span
                        className={`font-semibold ${
                          speakerTopicGuide.alignmentOk
                            ? "text-[#03A94D]"
                            : "text-[#E67700]"
                        }`}
                      >
                        {speakerTopicGuide.kind === "visit"
                          ? "방문 후기 주제"
                          : "정보·가이드 주제"}
                      </span>
                      <span className="mt-1 block">{speakerTopicGuide.message}</span>
                    </p>
                  ) : null}
                </>
              );
            })()}
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
          <Field label="글쓰기 톤">
            <div className="grid grid-cols-3 gap-2">
              {WRITING_SKILL_LEVEL_OPTIONS.map((o) => {
                const active =
                  resolveWritingSkillLevel(formValues).value === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() =>
                      patchImmediate({
                        writingSkillLevel: o.value,
                        proficiency: o.proficiency,
                      })
                    }
                    className={`briclog-pressable min-h-[44px] rounded-lg border px-2 py-2 text-left ${
                      active
                        ? "border-[#03C75A] bg-[#E8F9EF]"
                        : "border-[#E8EBED] bg-white"
                    }`}
                  >
                    <span className="block text-[13px] font-semibold text-[#191F28]">
                      {o.label}
                    </span>
                    {!compact && (
                      <span className="mt-0.5 block text-[10px] leading-snug text-[#8B95A1]">
                        {o.hint.slice(0, 36)}
                        {o.hint.length > 36 ? "…" : ""}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {!compact && (
              <p className="mt-1 text-[11px] text-[#8B95A1]">
                분량은 「글 분량」에서 고르는 약속입니다. 여기서는 말하는 사람
                느낌만 맞춥니다.
              </p>
            )}
          </Field>
          {speakerLocked && linkedPersona ? (
            <Field label="세부 관점">
              <p className="rounded-lg border border-[#E8EBED] bg-white px-3 py-2.5 text-[13px] text-[#4E5968]">
                화자 「{linkedPersona.speakerLabel}」와 연동 ·{" "}
                {linkedPersona.personaLabel}
                {linkedPersona.subtypeLabel
                  ? ` · ${linkedPersona.subtypeLabel}`
                  : ""}
              </p>
              {!compact && (
                <p className="mt-1 text-[11px] text-[#8B95A1]">
                  세부 관점을 바꾸려면 화자를 「자동추천」으로 두세요.
                </p>
              )}
            </Field>
          ) : (
            <Field label="세부 관점">
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
                    onChange={(e) =>
                      set("contentPersonaSubtype", e.target.value)
                    }
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
          )}
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
              value={formValues.emojiDensity || "none"}
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
