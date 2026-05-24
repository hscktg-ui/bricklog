"use client";

import { useState } from "react";
import {
  FEEDBACK_NEGATIVE_REASONS,
  saveFeedback,
} from "@/lib/learning/feedbackStore";

export default function ContentFeedbackBar({
  userId,
  brandId,
  channel,
  contentId,
}) {
  const [done, setDone] = useState(null);
  const [showReasons, setShowReasons] = useState(false);
  const [selected, setSelected] = useState([]);

  const submit = (rating, reasons = []) => {
    saveFeedback(userId, {
      rating,
      reasons,
      brandId,
      channel,
      contentId,
    });
    setDone(rating);
    setShowReasons(false);
  };

  const toggleReason = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  if (done) {
    return (
      <p className="text-[12px] text-[#03A94D]">
        피드백 반영됨 ({done === "up" ? "만족" : "수정 필요"}) · 브랜드 학습에
        저장
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-[#E8EBED] bg-[#FAFBFC] p-3">
      <p className="text-[12px] font-semibold text-[#4E5968]">이 결과가 어땠나요?</p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => submit("up")}
          className="rounded-lg border border-[#E8EBED] bg-white px-3 py-1.5 text-[13px] hover:border-[#03C75A]"
        >
          만족
        </button>
        <button
          type="button"
          onClick={() => setShowReasons(true)}
          className="rounded-lg border border-[#E8EBED] bg-white px-3 py-1.5 text-[13px] hover:border-[#E67700]"
        >
          수정 필요
        </button>
      </div>
      {showReasons && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {FEEDBACK_NEGATIVE_REASONS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => toggleReason(r.id)}
              className={`rounded-full px-2.5 py-1 text-[11px] ${
                selected.includes(r.id)
                  ? "bg-[#FFF8E6] text-[#E67700]"
                  : "bg-white border border-[#E8EBED] text-[#4E5968]"
              }`}
            >
              {r.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => submit("down", selected)}
            className="w-full mt-2 rounded-lg bg-[#4E5968] py-2 text-[12px] font-medium text-white"
          >
            전송
          </button>
        </div>
      )}
    </div>
  );
}
