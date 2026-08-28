"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import LandingPanelHeader from "@/components/landing/LandingPanelHeader";
import {
  DETAIL_PAGE_OPEN_EXAMPLES,
  detailPageSamplePageSrc,
  detailPageSampleSrc,
  resolveDetailPageSampleId,
} from "@/lib/product/detailPageCompanyPresets";
import {
  VISION_PANEL,
  VISION_TAB_ACTIVE,
  VISION_TAB_IDLE,
} from "@/lib/landing/vision2030Styles";

const STAGE_WIDTH = 860;

export default function DetailPageSampleZone({
  height = 640,
  initialId = "open-rice",
}) {
  const [id, setId] = useState(resolveDetailPageSampleId(initialId));
  const current =
    DETAIL_PAGE_OPEN_EXAMPLES.find((ex) => ex.id === id) ||
    DETAIL_PAGE_OPEN_EXAMPLES[0];
  const pageFull = detailPageSamplePageSrc(current.id, "full");
  const htmlSrc = detailPageSampleSrc(current.id);
  const frameRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = frameRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      if (w > 0) setScale(Math.min(1, w / STAGE_WIDTH));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div>
      <div className="inline-flex w-full rounded-full border border-[var(--vision-line)] bg-[var(--vision-panel-bg)] p-1 sm:w-auto">
        {DETAIL_PAGE_OPEN_EXAMPLES.map((ex) => (
          <button
            key={ex.id}
            type="button"
            onClick={() => setId(ex.id)}
            className={`min-h-[44px] flex-1 rounded-full px-4 text-[13px] font-semibold transition sm:flex-none sm:px-5 ${
              id === ex.id ? VISION_TAB_ACTIVE : VISION_TAB_IDLE
            }`}
          >
            {ex.label}
          </button>
        ))}
      </div>

      <div className={`mt-6 ${VISION_PANEL}`}>
        <LandingPanelHeader title={`${current.brandName} · ${current.productName}`} />
        <p className="border-b border-[var(--vision-line)] px-4 py-3 text-[13px] leading-relaxed text-[var(--vision-muted)] sm:px-5">
          상세는 이미지입니다. 상세 디자이너가 이 860 화면을 봅니다.
        </p>
        <div
          ref={frameRef}
          className="overflow-auto bg-[var(--vision-wash,#f4f1ea)]"
          style={{ maxHeight: height }}
        >
          <div
            style={{
              width: STAGE_WIDTH * scale,
              margin: "0 auto",
            }}
          >
            <img
              key={pageFull}
              src={pageFull}
              alt={`${current.productName} 상세 이미지`}
              width={STAGE_WIDTH}
              className="block h-auto max-w-none bg-white"
              style={{ width: STAGE_WIDTH * scale }}
            />
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-[13px] text-[var(--vision-muted)]">
        스마트스토어·쿠팡에 붙이는 860 이미지.{" "}
        <Link
          href={htmlSrc}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-[var(--vision-ink)] underline-offset-2 hover:underline"
        >
          HTML 원판 보기
        </Link>
      </p>
    </div>
  );
}
