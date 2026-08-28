"use client";

import Link from "next/link";
import { VISION_CTA_ACCENT, VISION_SECTION } from "@/lib/landing/vision2030Styles";

export default function PublicDetailPageInvite() {
  return (
    <section
      id="public-detail-page"
      className={`${VISION_SECTION} px-5 py-16 md:px-8 md:py-20`}
    >
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--vision-muted)]">
          상품 상세페이지
        </p>
        <h2 className="mt-3 text-[clamp(1.5rem,4vw,2rem)] font-semibold tracking-tight">
          상세페이지가 필요하면, 여기서 만드세요
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-[var(--vision-muted)]">
          가입 없이 상품명과 특징만 넣으면 됩니다. 스마트스토어·쿠팡에 붙이는 860px
          HTML이 바로 나갑니다.
        </p>
        <div className="mt-8 flex justify-center">
          <Link href="/detail" className={`${VISION_CTA_ACCENT} !w-auto`}>
            상세페이지 만들기
          </Link>
        </div>
      </div>
    </section>
  );
}
