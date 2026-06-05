"use client";

import { useState } from "react";
import { fetchWithAuth } from "@/lib/api/clientAuth";
import {
  FEEDBACK_REACTIONS,
  feedbackTagsForChannel,
} from "@/lib/feedback/constants";
import { buildRewriteFromFeedback } from "@/lib/feedback/buildRewriteFromFeedback";

export default function ContentFeedbackPanel({
  contentItemId,
  brandId = null,
  channel = "blog",
  blogInput = null,
  suggestionHints = [],
  compact = false,
  onSubmitted,
  onReflect,
}) {
  const [reaction, setReaction] = useState(null);
  const [tags, setTags] = useState([]);
  const [memo, setMemo] = useState("");
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reflecting, setReflecting] = useState(false);
  const [error, setError] = useState("");
  const tagOptions = feedbackTagsForChannel(channel);

  const toggleTag = (id) => {
    setTags((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const submit = async () => {
    if (!reaction) return;
    setSaving(true);
    setError("");
    const payload = { reaction, tags, memo };
    try {
      if (contentItemId) {
        await fetchWithAuth("/api/feedback/submit", {
          method: "POST",
          body: JSON.stringify({
            contentItemId,
            brandId,
            channel,
            reaction,
            tags,
            memo,
          }),
        });
      }

      const { shouldRewrite, feedbackText, scope, inputPatch } =
        buildRewriteFromFeedback({
          reaction,
          tags,
          memo,
          blogInput: blogInput || {},
          channel,
        });

      if (shouldRewrite && onReflect) {
        setReflecting(true);
        try {
          await onReflect({
            ...payload,
            feedbackText,
            scope,
            inputPatch,
          });
        } finally {
          setReflecting(false);
        }
      }

      setDone(true);
      onSubmitted?.(payload);
    } catch (err) {
      setError("저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    const label =
      FEEDBACK_REACTIONS.find((r) => r.id === reaction)?.label || reaction;
    const reflected =
      reaction !== "good" &&
      (tags.length > 0 || memo.trim()) &&
      !!onReflect;
    return (
      <p className="text-[12px] text-[#03A94D]">
        {reflected
          ? `피드백이 글에 반영되었습니다 (${label}) · 서버·브랜드 학습에 저장됩니다`
          : `피드백이 서버에 저장되었습니다 (${label}) · 전체 품질 개선에 반영됩니다`}
        {!contentItemId && " · 콘텐츠 저장 후 다음부터 기록에 남습니다"}
      </p>
    );
  }

  const busy = saving || reflecting;
  const willReflect =
    !!onReflect &&
    reaction &&
    reaction !== "good" &&
    (tags.length > 0 || memo.trim() || reaction === "bad");

  const hints = (suggestionHints || []).filter(Boolean).slice(0, 3);

  return (
    <div
      className={`rounded-xl border border-[#E8EBED] bg-[#FAFBFC] ${
        compact ? "p-2.5" : "p-3"
      }`}
    >
      <p className="text-[12px] font-semibold text-[#4E5968]">
        이 결과 피드백 · 보완·개선점
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-[#8B95A1]">
        솔직한 의견이 브랜드 맞춤과 전체 엔진 품질 개선에 반영됩니다.
        {!contentItemId &&
          " 저장 전에도 보낼 수 있으며, 수정이 필요하면 글에 바로 반영합니다."}
      </p>
      {hints.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {hints.map((hint) => (
            <button
              key={hint}
              type="button"
              onClick={() =>
                setMemo((prev) =>
                  prev.trim() ? `${prev.trim()} · ${hint}` : hint
                )
              }
              className="rounded-full border border-[#E8EBED] bg-white px-2.5 py-1 text-[10px] text-[#4E5968] hover:border-[#03C75A]"
            >
              + {hint}
            </button>
          ))}
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        {FEEDBACK_REACTIONS.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setReaction(r.id)}
            className={`rounded-lg border px-3 py-1.5 text-[13px] ${
              reaction === r.id
                ? "border-[#03C75A] bg-[#E8F9EF] text-[#03A94D]"
                : "border-[#E8EBED] bg-white hover:border-[#03C75A]"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      {reaction && reaction !== "good" && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tagOptions.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => toggleTag(t.id)}
              className={`rounded-full px-2.5 py-1 text-[11px] ${
                tags.includes(t.id)
                  ? "bg-[#FFF8E6] text-[#E67700]"
                  : "border border-[#E8EBED] bg-white text-[#4E5968]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      <textarea
        className="mt-3 w-full rounded-lg border border-[#E8EBED] bg-white px-3 py-2 text-[12px]"
        rows={2}
        placeholder="보완·개선점을 적어 주세요 (예: 광고 같음, 정보 부족, 말투가 딱딱함, 지역명 틀림)"
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
      />
      {error && <p className="mt-1 text-[11px] text-red-600">{error}</p>}
      <button
        type="button"
        disabled={!reaction || busy}
        onClick={submit}
        className="mt-2 w-full rounded-lg bg-[#4E5968] py-2 text-[12px] font-medium text-white disabled:opacity-50"
      >
        {reflecting
          ? channel === "place"
            ? "스마트플레이스 반영 중…"
            : channel === "instagram"
              ? "인스타 반영 중…"
              : "피드백 반영 중…"
          : saving
            ? "저장 중…"
            : willReflect
              ? channel === "place"
                ? "반영해서 플레이스 다듬기"
                : channel === "instagram"
                  ? "반영해서 인스타 다듬기"
                  : "반영해서 다듬기"
              : "서버에 피드백 보내기"}
      </button>
    </div>
  );
}
