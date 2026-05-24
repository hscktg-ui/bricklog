"use client";

import { useEffect, useState } from "react";
import {
  loadRewriteVersions,
  pushRewriteVersion,
  seedInitialVersion,
} from "@/lib/rewrite/rewriteVersions";
import { saveRewriteFeedback } from "@/lib/learning/feedbackStore";

const PLACEHOLDERS = {
  blog: "수정 방향을 입력하세요. 예: 더 담백하게, 광고티 줄이기",
  place: "예: 블로그 운영 포인트를 더 담아, 공지 톤으로 짧게",
  instagram: "예: 블로그 장면을 더 살려, 이모지·줄바꿈 강화",
};

const SCOPE_OPTIONS = {
  blog: [
    { value: "all", label: "전체" },
    { value: "title", label: "제목만" },
    { value: "intro", label: "도입부만" },
    { value: "sections", label: "본문 섹션" },
    { value: "conclusion", label: "마무리만" },
  ],
  place: [
    { value: "all", label: "전체" },
    { value: "title", label: "제목" },
    { value: "cta", label: "CTA" },
  ],
  instagram: [
    { value: "all", label: "전체" },
    { value: "hook", label: "Hook만" },
  ],
};

export default function RewriteFeedbackPanel({
  channel = "blog",
  content,
  contentId,
  userId,
  brandId,
  onRewrite,
  onApplyVersion,
}) {
  const [feedback, setFeedback] = useState("");
  const [scope, setScope] = useState("all");
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState([]);
  const [compareId, setCompareId] = useState(null);

  useEffect(() => {
    if (!contentId || !content) return;
    seedInitialVersion(contentId, content);
    setVersions(loadRewriteVersions(contentId));
  }, [contentId, content]);

  const handleRewrite = async () => {
    if (!feedback.trim() || !onRewrite) return;
    setLoading(true);
    try {
      const result = await onRewrite(feedback.trim(), scope);
      if (result?.pack) {
        const label = `v${versions.length + 1} ${feedback.slice(0, 12)}`;
        pushRewriteVersion(contentId, {
          label,
          content: result.pack,
          feedbackText: feedback,
          feedbackCategory: result.intent?.categories,
        });
        setVersions(loadRewriteVersions(contentId));
        onApplyVersion?.(result.pack);
        if (userId) {
          saveRewriteFeedback(userId, {
            brandId,
            channel,
            feedbackText: feedback,
            feedbackCategory: result.intent?.categories,
            contentId,
          });
        }
        setFeedback("");
      }
    } finally {
      setLoading(false);
    }
  };

  const compare = versions.find((v) => v.id === compareId);

  return (
    <div className="rounded-xl border border-[#E8EBED] bg-[#FAFBFC] p-3 space-y-3">
      <p className="text-[12px] font-semibold text-[#4E5968]">피드백 반영 수정</p>
      <div className="flex flex-wrap gap-1.5">
        {(SCOPE_OPTIONS[channel] || SCOPE_OPTIONS.blog).map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => setScope(o.value)}
            className={`rounded-full px-2.5 py-1 text-[10px] ${
              scope === o.value
                ? "bg-[#03C75A] text-white"
                : "border border-[#E8EBED] bg-white text-[#4E5968]"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <textarea
        className="w-full rounded-lg border border-[#E8EBED] bg-white px-3 py-2 text-[13px] resize-y min-h-[56px]"
        placeholder={PLACEHOLDERS[channel] || PLACEHOLDERS.blog}
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
      />
      <button
        type="button"
        disabled={loading || !feedback.trim()}
        onClick={handleRewrite}
        className="w-full rounded-lg bg-[#4E5968] py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
      >
        {loading
          ? channel === "place"
            ? "스마트플레이스 반영 중…"
            : channel === "instagram"
              ? "인스타 반영 중…"
              : "반영 중…"
          : channel === "place"
            ? "스마트플레이스 재생성"
            : channel === "instagram"
              ? "인스타 재생성"
              : "피드백 반영"}
      </button>

      {versions.length > 1 && (
        <div>
          <p className="text-[11px] font-semibold text-[#8B95A1]">버전 기록</p>
          <ul className="mt-1 space-y-1">
            {versions.map((v) => (
              <li key={v.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCompareId(compareId === v.id ? null : v.id)}
                  className="text-[11px] text-[#03A94D] hover:underline"
                >
                  {v.label}
                </button>
                {v.id !== versions[0]?.id && (
                  <button
                    type="button"
                    onClick={() => onApplyVersion?.(v.content)}
                    className="text-[10px] text-[#8B95A1] hover:text-[#191F28]"
                  >
                    적용
                  </button>
                )}
              </li>
            ))}
          </ul>
          {compare && (
            <p className="mt-2 text-[10px] text-[#8B95A1]">
              비교: {compare.feedbackText || "초기"} · {compare.at?.slice(0, 10)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
