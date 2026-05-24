"use client";

import { buildUploadGuide } from "@/lib/brands/uploadGuide";

export default function UploadGuidePanel({ blogInput, blog, place, insta }) {
  if (!blog && !place && !insta) return null;

  const guide = buildUploadGuide({
    kpiGoal: blogInput?.kpiGoal,
    industry: blogInput?.industry,
    channels: { blog: !!blog, place: !!place, instagram: !!insta },
  });

  return (
    <div className="rounded-xl border border-[#E8EBED] bg-gradient-to-br from-[#FAFBFC] to-[#E8F9EF]/30 p-4">
      <p className="text-[12px] font-bold text-[#191F28]">채널별 운영 참고</p>
      <p className="mt-1 text-[11px] text-[#8B95A1]">
        직접 게시 시 참고 · KPI {guide.kpiLabel}
      </p>
      <div className="mt-3 grid gap-2 text-[11px] text-[#4E5968] sm:grid-cols-3">
        {guide.uploadTimes.blog && (
          <div className="rounded-lg bg-white px-2 py-2 ring-1 ring-[#E8EBED]">
            <span className="font-semibold text-[#03A94D]">블로그</span>
            <p className="mt-0.5">게시 참고 {guide.uploadTimes.blog.best.join(", ")}</p>
          </div>
        )}
        {guide.uploadTimes.place && (
          <div className="rounded-lg bg-white px-2 py-2 ring-1 ring-[#E8EBED]">
            <span className="font-semibold text-[#03A94D]">플레이스</span>
            <p className="mt-0.5">게시 참고 {guide.uploadTimes.place.best.join(", ")}</p>
          </div>
        )}
        {guide.uploadTimes.instagram && (
          <div className="rounded-lg bg-white px-2 py-2 ring-1 ring-[#E8EBED]">
            <span className="font-semibold text-[#03A94D]">인스타</span>
            <p className="mt-0.5">게시 참고 {guide.uploadTimes.instagram.best.join(", ")}</p>
          </div>
        )}
      </div>
      <p className="mt-2 text-[11px] text-[#4E5968]">
        이미지 방향: {guide.imageDirection}
      </p>
      <ul className="mt-1 list-inside list-disc text-[11px] text-[#8B95A1]">
        {guide.opsTips.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  );
}
