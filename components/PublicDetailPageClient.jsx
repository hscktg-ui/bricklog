"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import DetailPageGenerator from "@/components/DetailPageGenerator";
import {
  VISION_LOGIN_LINK,
  VISION_NAV,
  VISION_NAV_INNER,
  VISION_PAGE,
} from "@/lib/landing/vision2030Styles";

export default function PublicDetailPageClient() {
  return (
    <div className={`${VISION_PAGE} flex min-h-[100dvh] flex-col`}>
      <header className={VISION_NAV}>
        <div className={VISION_NAV_INNER}>
          <Link href="/" aria-label="브릭로그 홈">
            <Logo />
          </Link>
          <nav className="flex items-center gap-2" aria-label="상세페이지">
            <Link
              href="/"
              className="hidden rounded-full px-3 py-2 text-[13px] font-semibold text-[var(--vision-muted)] sm:inline-flex"
            >
              브랜드 글
            </Link>
            <Link href="/?auth=login" className={VISION_LOGIN_LINK}>
              로그인
            </Link>
          </nav>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">
        <DetailPageGenerator variant="public" />
      </div>
    </div>
  );
}
