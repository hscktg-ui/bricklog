"use client";

import { useState } from "react";
import { fetchWithAuth } from "@/lib/api/clientAuth";
import {
  FEEDBACK_REACTIONS,
  FEEDBACK_LOOP_HINTS,
  feedbackTagsForChannel,
} from "@/lib/feedback/constants";
import { buildRewriteFromFeedback } from "@/lib/feedback/buildRewriteFromFeedback";
import { formatFeedbackIntentBrief } from "@/lib/feedback/feedbackIntentEngine";

export default function ContentFeedbackPanel({
  contentItemId,
  brandId = null,
  channel = "blog",
  blogInput = null,
  suggestionHints = [],
  feedbackRound = 0,
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
  const [lastSummary, setLastSummary] = useState(null);
  const tagOptions = feedbackTagsForChannel(channel);

  const resetForNextRound = () => {
    setDone(false);
    setReaction(null);
    setTags([]);
    setMemo("");
    setError("");
  };

  const toggleTag = (id) => {
    setTags((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const persistFeedback = async (payload, rewriteResult) => {
    if (!contentItemId) return null;
    const intents = payload.inputPatch?.feedbackHints || [];
    return fetchWithAuth("/api/feedback/submit", {
      method: "POST",
      body: JSON.stringify({
        contentItemId,
        brandId,
        channel,
        reaction: payload.reaction,
        tags: payload.tags,
        memo: payload.memo,
        intents,
        rewriteRound: rewriteResult?.pack?._meta?.rewriteCount ?? feedbackRound + 1,
      }),
    });
  };

  const submit = async () => {
    if (!reaction) return;
    setSaving(true);
    setError("");

    const payload = { reaction, tags, memo };
    const built = buildRewriteFromFeedback({
      reaction,
      tags,
      memo,
      blogInput: blogInput || {},
      channel,
    });

    let reflectedOk = false;
    let reflectResult = null;

    try {
      if (built.shouldRewrite && onReflect) {
        setReflecting(true);
        try {
          reflectResult = await onReflect({
            ...payload,
            feedbackText: built.feedbackText,
            scope: built.scope,
            inputPatch: built.inputPatch,
          });
          reflectedOk =
            reflectResult?.ok !== false && Boolean(reflectResult?.pack);
          if (!reflectedOk) {
            setError(
              "피드백 반영에 실패했습니다. 태그·메모를 조금 바꿔 다시 시도해 주세요."
            );
            return;
          }
        } finally {
          setReflecting(false);
        }
      }

      if (contentItemId) {
        await persistFeedback(
          {
            ...payload,
            inputPatch: built.inputPatch,
          },
          reflectResult
        );
      }

      const intentBrief = formatFeedbackIntentBrief(
        built.inputPatch?.feedbackHints,
        built.feedbackText
      );
      setLastSummary({
        reaction,
        reflected: reflectedOk,
        intentBrief,
        round: reflectResult?.pack?._meta?.rewriteCount ?? feedbackRound,
      });
      setDone(true);
      onSubmitted?.({
        ...payload,
        reflected: reflectedOk,
        intents: built.inputPatch?.feedbackHints,
      });
    } catch (err) {
      setError(
        reflectedOk
          ? "새 글은 준비됐지만 서버 저장에 실패했습니다. 잠시 후 다시 보내 주세요."
          : "저장하지 못했습니다. 잠시 후 다시 시도해 주세요."
      );
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    const label =
      FEEDBACK_REACTIONS.find((r) => r.id === reaction)?.label || reaction;
    const satisfied = reaction === "good";
    const reflected = lastSummary?.reflected;

    return (
      <div className="space-y-2">
        <p className="text-[12px] text-[#03A94D]">
          {satisfied
            ? `만족 피드백이 저장되었습니다 (${label}) · 이 톤을 브랜드·계정 학습에 반영합니다`
            : reflected
              ? `피드백이 반영된 새 글이 준비되었습니다 (${label}) · 위 본문을 확인해 주세요`
              : `피드백이 서버에 저장되었습니다 (${label})`}
          {!contentItemId && " · 콘텐츠 저장 후 기록·엔진 학습에 남습니다"}
        </p>
        {lastSummary?.intentBrief && (
          <p className="text-[11px] text-[#8B95A1]">{lastSummary.intentBrief}</p>
        )}
        {!satisfied && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={resetForNextRound}
              className="rounded-lg border border-[#03C75A] bg-[#E8F9EF] px-3 py-2 text-[12px] font-medium text-[#03A94D]"
            >
              아직 부족해요 · 한 번 더 다듬기
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                setError("");
                try {
                  if (contentItemId) {
                    await persistFeedback(
                      { reaction: "good", tags: [], memo: "", inputPatch: {} },
                      null
                    );
                  }
                  setLastSummary({ reaction: "good", reflected: false });
                  setReaction("good");
                  setDone(true);
                  onSubmitted?.({ reaction: "good", tags: [], memo: "", satisfied: true });
                } catch {
                  setError("만족 피드백 저장에 실패했습니다.");
                } finally {
                  setSaving(false);
                }
              }}
              className="rounded-lg border border-[#E8EBED] bg-white px-3 py-2 text-[12px] text-[#4E5968] disabled:opacity-50"
            >
              이제 괜찮아요
            </button>
          </div>
        )}
      </div>
    );
  }

  const busy = saving || reflecting;
  const willReflect =
    !!onReflect &&
    reaction &&
    reaction !== "good" &&
    (tags.length > 0 || memo.trim() || reaction === "bad");

  const hints = [
    ...FEEDBACK_LOOP_HINTS,
    ...(suggestionHints || []),
  ]
    .filter(Boolean)
    .slice(0, 6);

  const roundLabel =
    feedbackRound > 0 ? ` · 피드백 ${feedbackRound}회차` : "";

  return (
    <div
      className={`rounded-xl border border-[#E8EBED] bg-[#FAFBFC] ${
        compact ? "p-2.5" : "p-3"
      }`}
    >
      <p className="text-[12px] font-semibold text-[#4E5968]">
        발행 전 피드백{roundLabel}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-[#8B95A1]">
        「그대로 올려도 되겠다」고 느낄 때까지 태그·메모를 보내 주세요. 보낼 때마다
        새 글로 다시 써 드리고, 의견은 브랜드 맞춤·전체 엔진 개선에 자동 반영됩니다.
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
        placeholder="보완·개선점 (예: 광고 같음, 정보 부족, 지역명 틀림) — 원문은 글에 넣지 않고 의도로 반영합니다"
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
            ? "피드백 반영 · 플레이스 재작성…"
            : channel === "instagram"
              ? "피드백 반영 · 인스타 재작성…"
              : "피드백 반영 · 새 글 작성…"
          : saving
            ? "저장 중…"
            : reaction === "good"
              ? "만족 · 학습에 반영"
              : willReflect
                ? "피드백 반영해서 새 글 받기"
                : "피드백 보내기"}
      </button>
    </div>
  );
}
