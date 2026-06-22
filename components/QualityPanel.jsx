"use client";

import { useState } from "react";
import {
  CUSTOMER_DRAFT_READY,
  CUSTOMER_DRAFT_REVIEW,
} from "@/lib/copy/customerFacing";
import { getBlogLengthTierLabel } from "@/lib/constants";
import { resolvePublishReadiness } from "@/lib/product/publishUiDisplay";

function ChannelRow({ label, ready, hint }) {
  return (
    <li className="flex items-center justify-between gap-2 rounded-lg bg-[#FAFBFC] px-3 py-2 text-[12px]">
      <span className="font-semibold text-[#4E5968]">{label}</span>
      <span
        className={
          ready
            ? "font-semibold text-[#03A94D]"
            : "font-medium text-[#8B95A1]"
        }
      >
        {hint}
      </span>
    </li>
  );
}

function resolvePackHint(pack) {
  if (!pack) {
    return { ready: false, hint: "아직 없음" };
  }
  const readiness = resolvePublishReadiness(pack);
  const ready = readiness.status === "ready";
  const hint = ready
    ? CUSTOMER_DRAFT_READY
    : readiness.label || CUSTOMER_DRAFT_REVIEW;
  return { ready, hint };
}

export default function QualityPanel({
  results,
  meta,
  blogLengthTier = "medium",
}) {
  const [open, setOpen] = useState(false);
  if (!results?.blog) return null;

  const tierKey =
    results.blog._meta?.blogLengthTier || meta?.blogLengthTier || blogLengthTier;
  const blog = resolvePackHint(results.blog);
  const place = resolvePackHint(results.smartplace);
  const insta = resolvePackHint(results.insta);

  const hasTags = Boolean(
    results.hashtag?.all?.length || results.hashtag?.localTags?.length
  );
  const hasImage = Boolean(results.imagePrompt?.thumbnailPrompt);

  const readyCount = [blog.ready, place.ready, insta.ready, hasTags, hasImage].filter(
    Boolean
  ).length;

  return (
    <details
      className="mb-3 rounded-xl border border-[#E8EBED] bg-white"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="cursor-pointer list-none px-4 py-3 text-[13px] font-semibold text-[#191F28] marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-2">
          <span>발행 전 확인</span>
          <span className="text-[11px] font-semibold text-[#03A94D]">
            {readyCount}/5 준비
          </span>
        </span>
      </summary>
      <div className="border-t border-[#E8EBED] px-3 pb-3 pt-2">
        <ul className="space-y-1.5">
          <ChannelRow
            label={`이야기 · ${getBlogLengthTierLabel(tierKey)}`}
            ready={blog.ready}
            hint={blog.hint}
          />
          <ChannelRow
            label="스마트플레이스"
            ready={place.ready}
            hint={place.hint}
          />
          <ChannelRow
            label="인스타그램"
            ready={insta.ready}
            hint={insta.hint}
          />
          <ChannelRow
            label="해시태그"
            ready={hasTags}
            hint={hasTags ? CUSTOMER_DRAFT_READY : "아직 없음"}
          />
          <ChannelRow
            label="이미지 프롬프트"
            ready={hasImage}
            hint={hasImage ? CUSTOMER_DRAFT_READY : "아직 없음"}
          />
        </ul>
        <p className="mt-2 text-[11px] leading-relaxed text-[#8B95A1]">
          조사·톤·발행 준비도를 점검한 뒤 복사해 올리세요. 내부 점수는 표시하지
          않습니다.
        </p>
      </div>
    </details>
  );
}
