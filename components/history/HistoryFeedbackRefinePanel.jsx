"use client";

import { useState } from "react";
import { runRewrite } from "@/lib/rewrite/rewriteEngine";
import { serializeContent } from "@/lib/contentFormat";
import { saveGeneration } from "@/lib/generations";
import {
  baseTitleFromHistoryContent,
  buildRefinedDraftLabel,
} from "@/lib/history/refineDraftTitle";

const TAB_TO_CHANNEL = {
  blog: "blog",
  smartplace: "place",
  insta: "instagram",
};

const TAB_CONTENT_KEY = {
  blog: "blog",
  smartplace: "smartplace",
  insta: "insta",
};

export default function HistoryFeedbackRefinePanel({
  activeTab,
  record,
  results,
  userId,
  demoMode = false,
  onResultsChange,
  onSaved,
  onToast,
}) {
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);

  const channel = TAB_TO_CHANNEL[activeTab];
  const contentKey = TAB_CONTENT_KEY[activeTab];
  const content = results?.[contentKey];

  if (!record || !content || demoMode || !userId) return null;

  const handleRefine = async () => {
    const text = feedback.trim();
    if (text.length < 4) {
      onToast?.("보완할 방향을 4자 이상 적어 주세요.", "error");
      return;
    }
    setBusy(true);
    try {
      const ctx = {
        brandName: record.main_keyword || "",
        region: record.region || "",
        input: {
          industry: record.business_type,
          mainKeyword: record.main_keyword,
          purpose: record.purpose,
          tone: record.tone,
        },
      };
      const { pack } = runRewrite(channel, content, text, ctx, "all", []);
      const nextResults = { ...results, [contentKey]: pack };
      onResultsChange?.(nextResults);

      const baseTitle = baseTitleFromHistoryContent(channel, pack);
      const refinedLabel = buildRefinedDraftLabel(baseTitle);

      const row = {
        business_type: record.business_type,
        region: record.region || "",
        main_keyword: refinedLabel,
        sub_keywords: record.sub_keywords || "",
        purpose: `${record.purpose || ""} (보완)`.trim(),
        tone: record.tone || "",
        blog:
          activeTab === "blog"
            ? serializeContent(pack)
            : serializeContent(nextResults.blog),
        place:
          activeTab === "smartplace"
            ? serializeContent(pack)
            : serializeContent(nextResults.smartplace),
        instagram:
          activeTab === "insta"
            ? serializeContent(pack)
            : serializeContent(nextResults.insta),
        hashtags: record.hashtags,
        image_prompt: serializeContent(nextResults.imagePrompt),
        brand_id: record.brand_id || null,
        full_copy_text:
          activeTab === "blog" && record.full_copy_text
            ? record.full_copy_text
            : "",
      };

      await saveGeneration(userId, row);
      onSaved?.();
      onToast?.(`「${refinedLabel}」로 초안 기록에 저장했습니다.`, "success");
      setFeedback("");
    } catch (err) {
      onToast?.(err?.message || "보완 저장에 실패했습니다.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl border border-[#E8EBED] bg-[#FAFBFC] p-4">
      <h3 className="text-[13px] font-bold text-[#191F28]">피드백 보완</h3>
      <p className="mt-1 text-[11px] leading-relaxed text-[#8B95A1]">
        잘못된 초안을 고칠 때 사용하세요. 반영 후 새 항목으로 자동 저장됩니다.
      </p>
      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="예: 광고 톤 줄이기, 제목만 더 짧게, 이모지 줄이기…"
        className="mt-3 min-h-[72px] w-full resize-y rounded-lg border border-[#E8EBED] bg-white px-3 py-2 text-[13px] text-[#191F28] focus:border-[#03C75A] focus:outline-none"
      />
      <button
        type="button"
        disabled={busy || feedback.trim().length < 4}
        onClick={handleRefine}
        className="mt-3 w-full rounded-xl bg-[#03C75A] py-2.5 text-[13px] font-semibold text-white hover:bg-[#02B350] disabled:opacity-50"
      >
        {busy ? "보완 반영 중…" : "보완 반영 · 기록 저장"}
      </button>
    </section>
  );
}
