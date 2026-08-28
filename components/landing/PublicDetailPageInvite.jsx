"use client";

import Link from "next/link";
import { DETAIL_PAGE_PRODUCT } from "@/lib/product/detailPageProduct";

export default function PublicDetailPageInvite() {
  return (
    <section
      id="public-detail-page"
      className="border-t border-[var(--vision-line)] bg-[#f6f1ea] px-5 py-16 md:px-8 md:py-20"
    >
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-[#7c6a58]">
          {DETAIL_PAGE_PRODUCT.place}
        </p>
        <h2 className="mt-3 text-[clamp(1.5rem,4vw,2rem)] font-semibold tracking-tight text-[#1c1917]">
          {DETAIL_PAGE_PRODUCT.name}
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-[#5c534c]">
          사진·강조 문구·꼭 넣을 내용을 넣으면, 고를 때 막히는 점부터 보이는
          상품 화면이 나갑니다. 스마트스토어·쿠팡에 붙이면 됩니다.
        </p>
        <div className="mt-8 flex justify-center">
          <Link
            href="/detail"
            className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-[#1c1917] px-8 text-[15px] font-semibold text-[#f6f1ea] transition hover:bg-[#3f3a36]"
          >
            {DETAIL_PAGE_PRODUCT.name} 열기
          </Link>
        </div>
      </div>
    </section>
  );
}
