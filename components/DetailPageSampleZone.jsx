"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import LandingPanelHeader from "@/components/landing/LandingPanelHeader";
import {
  DETAIL_PAGE_OPEN_EXAMPLES,
  detailPageSampleSrc,
  resolveDetailPageSampleId,
} from "@/lib/product/detailPageCompanyPresets";
import {
  VISION_PANEL,
  VISION_TAB_ACTIVE,
  VISION_TAB_IDLE,
} from "@/lib/landing/vision2030Styles";

const STAGE_WIDTH = 860;
const STAGE_HEIGHT = 2800;

export default function DetailPageSampleZone({
  height = 640,
  initialId = "open-rice",
}) {
  const [id, setId] = useState(resolveDetailPageSampleId(initialId));
  const current =
    DETAIL_PAGE_OPEN_EXAMPLES.find((ex) => ex.id === id) ||
    DETAIL_PAGE_OPEN_EXAMPLES[0];
  const src = detailPageSampleSrc(current.id);
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

  const scaledHeight = Math.round(STAGE_HEIGHT * scale);

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
          {current.label} · 컷별 상품 사진까지 붙인 860 화면입니다.
        </p>
        <div
          ref={frameRef}
          className="overflow-auto bg-[var(--vision-wash,#f4f1ea)]"
          style={{ maxHeight: height }}
        >
          <div style={{ height: scaledHeight, width: "100%" }}>
            <iframe
              key={src}
              title={`${current.productName} 상세 맛보기`}
              src={src}
              className="block border-0 bg-white"
              style={{
                width: STAGE_WIDTH,
                height: STAGE_HEIGHT,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
              loading="lazy"
            />
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-[13px] text-[var(--vision-muted)]">
        스마트스토어·쿠팡에 붙이는 860 화면.{" "}
        <Link
          href={src}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-[var(--vision-ink)] underline-offset-2 hover:underline"
        >
          새 창에서 보기
        </Link>
      </p>
    </div>
  );
}
