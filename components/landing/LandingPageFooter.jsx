import Link from "next/link";
import { BRICLOG_SLOGAN, SITE_FOOTER_TAGLINE } from "@/lib/brand/copy";

export default function LandingPageFooter() {
  return (
    <footer className="border-t border-[var(--vision-line)] bg-[var(--vision-paper)] px-5 py-10 md:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[15px] font-semibold text-[var(--vision-ink)]">
            {SITE_FOOTER_TAGLINE || BRICLOG_SLOGAN}
          </p>
          <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-[var(--vision-muted)]">
            브랜드명·지역·주제로 이야기 · 플레이스 · 인스타 초안을 차곡 쌓습니다.
          </p>
        </div>
        <nav
          className="flex flex-wrap gap-x-4 gap-y-2 text-[13px] font-medium text-[var(--vision-accent)]"
          aria-label="법적 안내 및 도움말"
        >
          <Link href="/help" className="hover:underline">
            FAQ·도움말
          </Link>
          <Link href="/terms" className="hover:underline">
            이용약관
          </Link>
          <Link href="/privacy" className="hover:underline">
            개인정보처리방침
          </Link>
          <Link href="/refund" className="hover:underline">
            환불정책
          </Link>
          <a
            href="mailto:support@briclog.ai"
            className="text-[var(--vision-muted)] hover:text-[var(--vision-ink)] hover:underline"
          >
            support@briclog.ai
          </a>
        </nav>
      </div>
    </footer>
  );
}
