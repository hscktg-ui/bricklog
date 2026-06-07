import Link from "next/link";
import {
  BRAND_META_DESCRIPTION,
  BRAND_META_KEYWORDS,
  BRAND_META_TITLE,
  BRICLOG_SLOGAN,
} from "@/lib/brand/copy";

/**
 * 서버 HTML에 항상 포함 — 네이버·구글 크롤러용 (JS 없이 브랜드·서비스 설명)
 * 클라이언트 홈이 마운트되면 hidden 처리
 */
export default function SeoDiscoverabilityHero() {
  return (
    <section
      id="briclog-seo-intro"
      className="border-b border-[#E8EBED] bg-[#F7F8FA] px-4 py-10 text-center"
      aria-label="브릭로그 서비스 소개"
    >
      <h1 className="text-[22px] font-bold tracking-tight text-[#191F28] sm:text-[26px]">
        {BRAND_META_TITLE} — AI 브랜드 글쓰기
      </h1>
      <p className="mx-auto mt-3 max-w-2xl text-[14px] leading-relaxed text-[#4E5968]">
        {BRAND_META_DESCRIPTION}
      </p>
      <p className="mx-auto mt-2 max-w-xl text-[13px] text-[#8B95A1]">
        {BRICLOG_SLOGAN}
      </p>
      <p className="mx-auto mt-4 max-w-2xl text-[11px] leading-relaxed text-[#8B95A1]">
        {BRAND_META_KEYWORDS}
      </p>
      <nav
        className="mt-5 flex flex-wrap items-center justify-center gap-3 text-[13px] font-medium text-[#03A94D]"
        aria-label="바로가기"
      >
        <Link href="/terms" className="hover:underline">
          이용약관
        </Link>
        <span className="text-[#E8EBED]" aria-hidden>
          ·
        </span>
        <Link href="/privacy" className="hover:underline">
          개인정보처리방침
        </Link>
        <span className="text-[#E8EBED]" aria-hidden>
          ·
        </span>
        <a href="https://briclog.ai" className="hover:underline">
          briclog.ai
        </a>
      </nav>
    </section>
  );
}
