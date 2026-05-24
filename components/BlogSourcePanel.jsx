"use client";

import { blogSummaryOneLine, blogExcerpt } from "@/lib/transform/fromBlog";

export default function BlogSourcePanel({ blog, blogInput, baseLabel }) {
  if (!blog) {
    return (
      <div className="rounded-xl border border-[#E8EBED] bg-white p-6 text-center">
        <p className="text-[14px] font-medium text-[#4E5968]">
          기준 초안이 없습니다
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-[#8B95A1]">
          주제·브랜드를 입력한 뒤 프롬프트를 생성하거나, 다른 채널에서 초안을
          만든 뒤 이어 주세요.
        </p>
      </div>
    );
  }

  const sourceTag =
    baseLabel ||
    (blog._meta?.sourceChannel === "place"
      ? "플레이스 기반"
      : blog._meta?.sourceChannel === "instagram"
        ? "인스타 기반"
        : blog._meta?.sourceChannel === "form"
          ? "주제·브랜드 기반"
          : "스토리 기반");

  const excerpt = blogExcerpt(blog, 400);
  const brand = blogInput?.brandName?.trim() || "—";
  const region = blogInput?.region?.trim() || "—";
  const main = blogInput?.mainKeyword?.trim() || blog.title;

  return (
    <div className="rounded-xl border border-[#E8EBED] bg-white p-5">
      <p className="text-[11px] font-semibold tracking-wide text-[#8B95A1]">
        {sourceTag}
      </p>
      <h3 className="mt-2 text-[15px] font-semibold leading-snug text-[#191F28]">
        {blogSummaryOneLine(blog)}
      </h3>
      <dl className="mt-4 space-y-2 text-[12px] text-[#4E5968]">
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 text-[#8B95A1]">브랜드</dt>
          <dd>{brand}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 text-[#8B95A1]">지역</dt>
          <dd>{region}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 text-[#8B95A1]">키워드</dt>
          <dd>{main}</dd>
        </div>
      </dl>
      <p className="mt-4 line-clamp-6 whitespace-pre-wrap text-[13px] leading-relaxed text-[#8B95A1]">
        {excerpt}
      </p>
    </div>
  );
}
