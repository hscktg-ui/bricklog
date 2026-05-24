"use client";

import { useEffect, useState } from "react";
import { resolveBlogLengthTier } from "@/lib/constants";
import EditableField from "./EditableField";
import FullCopyButton from "./FullCopyButton";
import HumanEditBar from "./HumanEditBar";
import VerificationStatus from "./VerificationStatus";
import ContentFeedbackPanel from "@/components/feedback/ContentFeedbackPanel";
import PerformanceInputPanel from "@/components/feedback/PerformanceInputPanel";
import RewriteFeedbackPanel from "./RewriteFeedbackPanel";
import { buildRewriteFromFeedback } from "@/lib/feedback/buildRewriteFromFeedback";
import {
  pushRewriteVersion,
  seedInitialVersion,
} from "@/lib/rewrite/rewriteVersions";
import EditorAIReport from "./EditorAIReport";
import CoreQualityMetaPanel from "./CoreQualityMetaPanel";
import ContentQualityReviewPanel from "@/components/quality/ContentQualityReviewPanel";
import StudioAdvancedAuditNote from "@/components/billing/StudioAdvancedAuditNote";
import MobileSecondaryAccordion from "./MobileSecondaryAccordion";
import { parseHashtagsInput } from "@/lib/content/reapplyPack";
import {
  CUSTOMER_DRAFT_READY,
  CUSTOMER_DRAFT_REVIEW,
} from "@/lib/copy/customerFacing";
import { USER_QUALITY_GOAL } from "@/lib/quality/qualityTargets";
import { formatBlogFullCopy } from "@/utils/copyFormatter";
import { useSimpleWorkspaceMode } from "@/hooks/useSimpleWorkspaceMode";

export default function BlogResultView({
  blog,
  billingPlanId = "free",
  onCopy,
  onChange,
  onSave,
  similarity,
  userId,
  brandId,
  contentItemId = null,
  onRewrite,
  onEditorImprove,
  editorImproving = false,
  blogInput = null,
  onFeedbackReflected,
  conciseView = false,
}) {
  const [draft, setDraft] = useState(blog);
  const [savedFlash, setSavedFlash] = useState(false);
  const [sectionsOpen, setSectionsOpen] = useState(false);
  const [expertOpen, setExpertOpen] = useState(false);
  const { simpleMode } = useSimpleWorkspaceMode(userId);
  const [showSubheadings, setShowSubheadings] = useState(
    blog?._meta?.includeSubheadings !== false
  );

  useEffect(() => {
    setDraft(blog);
    setSavedFlash(false);
    setSectionsOpen(false);
    setExpertOpen(!simpleMode);
    setShowSubheadings(blog?._meta?.includeSubheadings === true);
  }, [blog, simpleMode]);

  const showExpertPanels = !simpleMode || expertOpen;

  if (!draft) return null;

  const simWarn = similarity?.warning || draft._meta?.similarity?.warning;

  const isBriefOnly = draft._meta?.isBriefOnly || draft.mode === "brief_only";

  const charCount = draft._meta?.charCount ?? 0;
  const lengthTier = resolveBlogLengthTier(
    draft._meta?.blogLengthTier || "medium"
  );
  const meetsMin =
    charCount >= lengthTier.min && charCount <= lengthTier.max + 200;
  const qualityScore = draft._meta?.qualityScore?.total;
  const titleOptions = (draft.titles || []).filter(
    (t) => t && t !== draft.representativeTitle
  );

  const patch = (partial) => {
    const next = { ...draft, ...partial };
    setDraft(next);
    onChange?.(next);
  };

  const updateSection = (idx, field, val) => {
    const sections = [...(draft.sections || [])];
    sections[idx] = { ...sections[idx], [field]: val };
    patch({ sections });
  };

  const removeSection = (idx) => {
    const sections = (draft.sections || []).filter((_, i) => i !== idx);
    patch({ sections });
  };

  const hashtagsStr = (draft.hashtags || [])
    .map((t) => (t.startsWith("#") ? t.slice(1) : t))
    .join(" ");

  const editorReport = draft.editorAI || draft._meta?.editorAI;
  const editorCompare = draft._meta?.editorCompare;
  const v4Suggestions = draft._meta?.v4Background?.suggestions || [];
  const qualityHint = draft._meta?.qualityHint;
  const showV4Hint =
    draft._meta?.softPass ||
    qualityHint ||
    (v4Suggestions.length > 0 && !draft._meta?.passOutput);
  const complianceBanner =
    draft._meta?.complianceUserBanner ||
    (draft._meta?.sensitiveIndustry && "법·의료 정보는 반드시 전문가 확인");
  const complianceWarnings = draft._meta?.complianceWarnings || [];
  const showCompliance =
    !isBriefOnly &&
    (draft._meta?.sensitiveIndustry || complianceWarnings.length > 0);

  const versionContentId = `blog-${brandId || "x"}-${draft.representativeTitle || "draft"}`;

  const handleFeedbackReflect = async ({
    reaction,
    tags,
    memo,
    feedbackText,
    scope,
    inputPatch,
  }) => {
    if (!onRewrite) return;
    const built =
      feedbackText != null
        ? { feedbackText, scope: scope || "all", inputPatch: inputPatch || {} }
        : buildRewriteFromFeedback({
            reaction,
            tags,
            memo,
            blogInput: blogInput || {},
          });
    const result = await onRewrite(built.feedbackText, built.scope || "all", {
      source: "feedback",
      tagIds: tags,
      inputPatch: built.inputPatch,
    });
    if (result?.pack) {
      seedInitialVersion(versionContentId, draft);
      pushRewriteVersion(versionContentId, {
        label: `피드백 ${tags?.[0] || reaction}`,
        content: result.pack,
        feedbackText: built.feedbackText,
        feedbackCategory: result.intent?.categories,
      });
      setDraft(result.pack);
      onChange?.(result.pack);
      onFeedbackReflected?.();
    }
  };

  return (
    <div className="space-y-3">
      {showCompliance && (
        <div className="rounded-xl border border-[#FFE0B2] bg-[#FFF8E6] px-4 py-3 text-[12px] leading-relaxed text-[#4E5968]">
          <p className="font-semibold text-[#191F28]">⚖️ {complianceBanner}</p>
          {complianceWarnings.length > 0 && (
            <ul className="mt-2 list-inside list-disc space-y-0.5 text-[#8B95A1]">
              {complianceWarnings.slice(0, 4).map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
          {draft._meta?.sensitiveCompliance?.disclaimer && (
            <p className="mt-2 text-[11px] text-[#8B95A1]">
              {draft._meta.sensitiveCompliance.disclaimer}
            </p>
          )}
        </div>
      )}
      {showExpertPanels && showV4Hint && !isBriefOnly && (
        <details className="rounded-xl border border-[#D4E8FF] bg-[#F0F7FF] text-[12px] leading-relaxed text-[#4E5968]">
          <summary className="cursor-pointer px-4 py-3 font-semibold text-[#191F28]">
            초안 안내 (선택)
          </summary>
          <div className="border-t border-[#D4E8FF]/60 px-4 pb-3 pt-2">
            {qualityHint && <p>{qualityHint}</p>}
            {v4Suggestions.length > 0 && (
              <p className={qualityHint ? "mt-1 text-[#8B95A1]" : ""}>
                다듬으면 좋을 부분: {v4Suggestions.slice(0, 2).join(", ")}
                {v4Suggestions.length > 2 ? " 등" : ""} — 마음에 들지 않으면
                「다시 생성」 또는 직접 수정해 주세요.
              </p>
            )}
            {!qualityHint && v4Suggestions.length === 0 && (
              <p>
                아래 초안을 확인한 뒤, 필요하면 다시 생성하거나 직접 고쳐 주세요.
              </p>
            )}
          </div>
        </details>
      )}
      {showExpertPanels && isBriefOnly && (
        <details className="rounded-xl border border-[#FFE0B2] bg-[#FFF8E6] text-[12px] leading-relaxed text-[#4E5968]">
          <summary className="cursor-pointer px-4 py-3 font-semibold text-[#191F28]">
            구성안 모드 안내
          </summary>
          <p className="border-t border-[#FFE0B2]/60 px-4 pb-3 pt-2">
            아래는 브랜드 정리·추천 제목·글 뼈대(구성안)입니다. 완성 이야기는 AI
            연결 후 「이야기 쓰기」로 생성합니다. 플레이스·인스타는 해당 메뉴의
            「바로 만들기」로 먼저 쓸 수 있습니다.
          </p>
        </details>
      )}

      {showExpertPanels ? (
        <>
          <StudioAdvancedAuditNote planId={billingPlanId} />
          {draft._meta?.contentQualityReview ? (
            <ContentQualityReviewPanel
              review={draft._meta.contentQualityReview}
            />
          ) : null}
        </>
      ) : null}

      {simWarn && (simpleMode || !showExpertPanels) ? (
        <div
          className="rounded-xl border border-[#FFE0B2] bg-[#FFF8E6] px-4 py-3 text-[12px] font-medium leading-relaxed text-[#E67700]"
          role="status"
        >
          {simWarn}
        </div>
      ) : null}

      <p className="text-[11px] font-bold uppercase tracking-wide text-[#03A94D]">
        최종 콘텐츠
      </p>
      <div className="rounded-xl border-2 border-[#03C75A]/25 bg-[#F6FDF9] p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[13px] font-bold text-[#191F28]">발행 전 복사용 완성본</p>
          <FullCopyButton
            text={draft.fullCopyText}
            onCopy={() => onCopy?.(draft.fullCopyText)}
          />
        </div>
        <p className="mt-1 text-[11px] text-[#8B95A1]">
          제목·소제목·문단 사이 빈 줄 · 폼 항목 이름(말투·금지어 등)은 포함하지 않음
        </p>
        <pre
          className={`mt-3 overflow-y-auto whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-[#4E5968] ${
            conciseView ? "max-h-[min(60vh,480px)]" : "max-h-[280px]"
          }`}
        >
          {draft.fullCopyText}
        </pre>
        <label className="mt-3 flex items-center gap-2 text-[12px] text-[#4E5968]">
          <input
            type="checkbox"
            checked={showSubheadings}
            onChange={(e) => {
              const on = e.target.checked;
              setShowSubheadings(on);
              const nextMeta = {
                ...draft._meta,
                includeSubheadings: on,
              };
              patch({
                _meta: nextMeta,
                fullCopyText: formatBlogFullCopy(
                  { ...draft, _meta: nextMeta },
                  { includeSubheadings: on }
                ),
              });
            }}
          />
          소제목·문단 구분 포함 (권장)
        </label>
      </div>

      {simpleMode && (
        <button
          type="button"
          onClick={() => setExpertOpen((o) => !o)}
          className="flex min-h-[44px] w-full items-center justify-center rounded-xl border border-[#E8EBED] bg-white px-4 py-3 text-[13px] font-semibold text-[#4E5968] hover:bg-[#F9FAFB]"
        >
          {expertOpen
            ? "간단히 보기"
            : "전문가 보기 — 점검·제목 수정·피드백"}
        </button>
      )}

      {showExpertPanels && (
      <MobileSecondaryAccordion
        title="제목 · 수정 · 피드백"
        collapsed={conciseView}
      >
        <HumanEditBar
          onSave={() => {
            onSave?.(draft);
            setSavedFlash(true);
          }}
          saved={savedFlash || draft._edited}
          similarity={similarity || draft._meta?.similarity}
        />

        {titleOptions.length > 0 && (
          <div className="rounded-xl border border-[#E8EBED] bg-[#F9FAFB] p-4">
            <p className="text-[12px] font-bold text-[#4E5968]">추천 제목</p>
            <ul className="mt-2 space-y-1.5">
              {titleOptions.slice(0, 4).map((t) => (
                <li key={t}>
                  <button
                    type="button"
                    className="w-full rounded-lg px-2 py-1.5 text-left text-[13px] text-[#191F28] hover:bg-white"
                    onClick={() =>
                      patch({
                        representativeTitle: t,
                        title: t,
                      })
                    }
                  >
                    {t}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <EditableField
          label="대표 제목"
          value={draft.representativeTitle || draft.title}
          rows={2}
          onChange={(v) => patch({ representativeTitle: v, title: v })}
        />

        <p className="text-[12px] text-[#8B95A1]">네이버 블로그 · 읽고 고치기</p>

        <VerificationStatus
          verification={draft.qualityReport?.verification}
          factCheck={draft.qualityReport?.factCheck}
        />

        <div className="flex flex-wrap gap-2">
          <div
            className={`rounded-xl px-3 py-2 text-[11px] font-semibold ${
              meetsMin
                ? "border border-[#03C75A]/20 bg-[#E8F9EF] text-[#03A94D]"
                : "border border-[#FFE0B2] bg-[#FFF8E6] text-[#E67700]"
            }`}
          >
            본문 {charCount.toLocaleString()}자
            {!meetsMin &&
              ` · 권장 ${lengthTier.target.toLocaleString()}자 (${lengthTier.min.toLocaleString()}자+)`}
          </div>
          {typeof qualityScore === "number" && (
            <div
              className={`rounded-xl border px-3 py-2 text-[11px] font-semibold ${
                qualityScore >= USER_QUALITY_GOAL && !draft._meta?.outputWithheld
                  ? "border-[#03C75A]/20 bg-[#E8F9EF] text-[#03A94D]"
                  : "border-[#FFE0B2] bg-[#FFF8E6] text-[#E67700]"
              }`}
            >
              {draft._meta?.outputWithheld
                ? CUSTOMER_DRAFT_REVIEW
                : qualityScore >= USER_QUALITY_GOAL
                  ? CUSTOMER_DRAFT_READY
                  : CUSTOMER_DRAFT_REVIEW}
            </div>
          )}
          {draft._meta?.contentPersonaLabel && (
            <div className="rounded-xl border border-[#E8EBED] bg-white px-3 py-2 text-[11px] text-[#4E5968]">
              관점 · {draft._meta.contentPersonaLabel}
              {draft._meta.contentPersonaSource === "auto" && (
                <span className="text-[#03A94D]"> (자동)</span>
              )}
            </div>
          )}
        </div>

        <CoreQualityMetaPanel meta={draft._meta} />

        <button
          type="button"
          onClick={() => setSectionsOpen((o) => !o)}
          className="flex min-h-[44px] w-full items-center justify-between rounded-xl border border-[#E8EBED] bg-white px-4 py-3 text-[13px] font-semibold text-[#4E5968] hover:bg-[#F9FAFB]"
        >
          섹션별 보기 · 수정
          <span className="text-[#8B95A1]">{sectionsOpen ? "접기" : "펼치기"}</span>
        </button>

        {sectionsOpen && (
          <>
            {(draft.sections || []).map((section, idx) => (
              <div key={idx} className="space-y-2">
                <EditableField
                  label={`소제목 ${idx + 1}`}
                  value={section.heading}
                  rows={1}
                  onChange={(v) => updateSection(idx, "heading", v)}
                  onDelete={
                    (draft.sections?.length || 0) > 3
                      ? () => removeSection(idx)
                      : undefined
                  }
                />
                <EditableField
                  label="본문"
                  value={section.body}
                  rows={6}
                  hint="문단·줄바꿈 유지"
                  onChange={(v) => updateSection(idx, "body", v)}
                />
              </div>
            ))}

            <EditableField
              label="마무리"
              value={draft.conclusion}
              rows={4}
              onChange={(v) => patch({ conclusion: v })}
            />

            <EditableField
              label="해시태그"
              value={hashtagsStr}
              rows={2}
              hint="쉼표 또는 공백으로 구분"
              onChange={(v) => patch({ hashtags: parseHashtagsInput(v) })}
            />
          </>
        )}

        {editorReport && (
          <EditorAIReport
            report={editorReport}
            channel="blog"
            compare={editorCompare}
            onImprove={onEditorImprove}
            improving={editorImproving}
          />
        )}

        {userId && (
          <div className="space-y-3">
            <ContentFeedbackPanel
              contentItemId={contentItemId}
              brandId={brandId}
              channel="blog"
              blogInput={blogInput}
              onReflect={onRewrite ? handleFeedbackReflect : undefined}
            />
            {contentItemId && (
              <PerformanceInputPanel contentItemId={contentItemId} />
            )}
          </div>
        )}

        {onRewrite && (
          <RewriteFeedbackPanel
            channel="blog"
            content={draft}
            contentId={`blog-${brandId || "x"}-${draft.representativeTitle || "draft"}`}
            userId={userId}
            brandId={brandId}
            onRewrite={(text, scope) =>
              onRewrite(text, scope, { source: "feedback" })
            }
            onApplyVersion={(pack) => {
              setDraft(pack);
              onChange?.(pack);
            }}
          />
        )}
      </MobileSecondaryAccordion>
      )}
    </div>
  );
}
