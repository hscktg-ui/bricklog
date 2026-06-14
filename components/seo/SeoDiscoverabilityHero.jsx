import Link from "next/link";
import {
  BRAND_LATEST_UPDATE,
  BRAND_META_DESCRIPTION,
  BRAND_META_TITLE,
  BRICLOG_SLOGAN,
} from "@/lib/brand/copy";

/**
 * 서버 HTML에 항상 포함 — 네이버·구글 크롤러용 (JS 없이 브랜드·서비스 설명)
 */
export default function SeoDiscoverabilityHero() {
  return (
    <section
      id="briclog-seo-intro"
      className="border-b border-[#E8EBED] bg-[#F7F8FA] px-4 py-10 text-center"
      aria-label="브릭로그 서비스 소개"
    >
      <p className="inline-block rounded-full bg-[#E8F9EF] px-3 py-1 text-[11px] font-semibold text-[#03A94D]">
        {BRAND_LATEST_UPDATE.label}
      </p>
      <h1 className="mt-4 text-[22px] font-bold tracking-tight text-[#191F28] sm:text-[26px]">
        {BRAND_META_TITLE}
      </h1>
      <p className="mx-auto mt-2 max-w-xl text-[15px] font-semibold text-[#191F28]">
        {BRAND_LATEST_UPDATE.headline}
      </p>
      <p className="mx-auto mt-3 max-w-2xl text-[14px] leading-relaxed text-[#4E5968]">
        {BRAND_META_DESCRIPTION}
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
      <p className="mx-auto mt-3 max-w-xl text-[13px] text-[#8B95A1]">
        {BRICLOG_SLOGAN}
      </p>
      <nav
        className="mt-5 flex flex-wrap items-center justify-center gap-3 text-[13px] font-medium text-[#03A94D]"
        aria-label="바로가기"
      >
        <Link href="/help" className="hover:underline">
          자주 묻는 질문
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
