"use client";

import { DETAIL_PAGE_PRODUCT } from "@/lib/product/detailPageProduct";

export default function DetailPageSampleFrame({
  caption = "포장 쌀 맛보기 · 사진 칸은 비어 있습니다",
  height = 640,
}) {
  return (
    <figure className="overflow-hidden rounded-[1.5rem] border border-[var(--vision-line)] bg-[var(--vision-panel-bg,#fff)] shadow-[var(--vision-shadow-soft)]">
      <figcaption className="border-b border-[var(--vision-line)] px-4 py-3 text-[13px] leading-relaxed text-[var(--vision-muted)]">
        {caption}
      </figcaption>
      <div
        className="overflow-auto bg-[#f4f1ea]"
        style={{ maxHeight: height }}
      >
        <iframe
          title="브릭로그 상세 맛보기"
          src={DETAIL_PAGE_PRODUCT.samplePath}
          className="mx-auto block border-0 bg-white"
          style={{ width: 860, height: 2800 }}
          loading="lazy"
        />
      </div>
    </figure>
  );
}
