import Link from "next/link";
import {
  BRAND_LATEST_UPDATE,
  BRAND_META_DESCRIPTION,
  BRAND_META_TITLE_KO,
  BRICLOG_SLOGAN,
  LANDING_PRIMARY_CTA,
} from "@/lib/brand/copy";
import { GUIDE_PAGES } from "@/lib/seo/guidePages";
import { DETAIL_PAGE_PRODUCT } from "@/lib/product/detailPageProduct";

const SEO_SEARCH_PHRASES = [
  "브랜드 이야기",
  "스마트플레이스 공지",
  "인스타 캡션",
  "골라보다 상세페이지",
  "운영 계획",
  "지역 브랜드",
];

/**
 * 서버 HTML에 항상 포함 — 네이버·구글 크롤러용 (JS 없이 브랜드·서비스 설명)
 * 서버 h1 — HeroSection은 클라이언트 전용이라 크롤러용 제목은 여기가 SSOT
 */
export default function SeoDiscoverabilityHero() {
  const featuredGuides = GUIDE_PAGES.slice(0, 4);

  return (
    <section
      id="briclog-seo-intro"
      className="border-b border-[#E8EBED] bg-[#F7F8FA] px-4 py-8 text-center sm:py-10"
      aria-label="브릭로그 서비스 소개"
    >
      <p className="inline-block rounded-full bg-[#E8F9EF] px-3 py-1 text-[11px] font-semibold text-[#03A94D]">
        {BRAND_LATEST_UPDATE.label} · 샘플 체험 · 가입 없이 미리보기
      </p>
      <h1 className="mt-4 text-[22px] font-bold tracking-tight text-[#191F28] sm:text-[28px]">
        {BRAND_META_TITLE_KO} — 브랜드 콘텐츠 운영
      </h1>
      <p className="mx-auto mt-2 max-w-xl text-[15px] font-semibold text-[#191F28]">
        {BRAND_LATEST_UPDATE.headline}
      </p>
      <p className="mx-auto mt-3 max-w-2xl text-[14px] leading-relaxed text-[#4E5968]">
        {BRAND_META_DESCRIPTION}
      </p>
      <p className="mx-auto mt-3 max-w-2xl text-[14px] leading-relaxed text-[#4E5968]">
        {DETAIL_PAGE_PRODUCT.versusGpt} {DETAIL_PAGE_PRODUCT.versusUs}{" "}
        <Link href="/detail" className="font-semibold text-[#03A94D] hover:underline">
          {DETAIL_PAGE_PRODUCT.name}
        </Link>
        에서 붙일 860px 화면을 만듭니다.
      </p>
      <p className="mx-auto mt-2 max-w-2xl text-[13px] text-[#8B95A1]">
        {SEO_SEARCH_PHRASES.join(" · ")}
      </p>
      <ul className="mx-auto mt-4 max-w-xl space-y-1 text-left text-[13px] text-[#4E5968] sm:text-center sm:list-none">
        {BRAND_LATEST_UPDATE.bullets.map((line) => (
          <li key={line} className="flex gap-2 sm:justify-center">
            <span className="text-[#03A94D]" aria-hidden>
              ✓
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
      <p className="mx-auto mt-3 max-w-xl text-[13px] text-[#8B95A1]">{BRICLOG_SLOGAN}</p>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/#public-brand-test"
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#03C75A] px-5 py-2.5 text-[14px] font-bold text-white shadow-sm transition hover:opacity-95"
        >
          {LANDING_PRIMARY_CTA}
        </Link>
        <Link
          href="/guides"
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#E8EBED] bg-white px-5 py-2.5 text-[14px] font-semibold text-[#191F28] hover:border-[#03A94D]/40"
        >
          업종별 작성 가이드
        </Link>
      </div>

      <nav
        className="mx-auto mt-5 flex max-w-2xl flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[12px] text-[#4E5968]"
        aria-label="검색용 가이드 링크"
      >
        {featuredGuides.map((page) => (
          <Link
            key={page.slug}
            href={`/guides/${page.slug}`}
            className="text-[#03A94D] hover:underline"
          >
            {page.title.split("—")[0].trim()}
          </Link>
        ))}
      </nav>

      <nav
        className="mt-4 flex flex-wrap items-center justify-center gap-3 text-[13px] font-medium text-[#03A94D]"
        aria-label="바로가기"
      >
        <Link href="/help" className="hover:underline">
          자주 묻는 질문
        </Link>
        <span className="text-[#E8EBED]" aria-hidden>
          ·
        </span>
        <Link href="/guides" className="hover:underline">
          콘텐츠 가이드
        </Link>
        <span className="text-[#E8EBED]" aria-hidden>
          ·
        </span>
        <Link href="/terms" className="hover:underline">
          이용약관
        </Link>
        <span className="text-[#E8EBED]" aria-hidden>
          ·
        </span>
        <Link href="/privacy" className="hover:underline">
          개인정보처리방침
        </Link>
      </nav>
    </section>
  );
}
