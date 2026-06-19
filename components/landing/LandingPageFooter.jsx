import Link from "next/link";
import { BRICLOG_SLOGAN, SITE_FOOTER_TAGLINE } from "@/lib/brand/copy";
import LandingFooterAudio from "@/components/landing/LandingFooterAudio";
import LandingFooterSocial from "@/components/landing/LandingFooterSocial";

export default function LandingPageFooter() {
  return (
    <footer
      className="border-t border-[var(--vision-line)] bg-[var(--vision-paper)] px-5 py-10 md:px-8"
      role="contentinfo"
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-lg space-y-8">
            <div>
              <p className="text-[15px] font-semibold tracking-tight text-[var(--vision-ink)]">
                {SITE_FOOTER_TAGLINE || BRICLOG_SLOGAN}
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--vision-muted)]">
                브랜드명·지역·주제로 이야기 · 플레이스 · 인스타 초안을 차곡 쌓습니다.
              </p>
            </div>

            <LandingFooterSocial />

            <LandingFooterAudio />
          </div>

          <nav
            className="flex flex-col gap-3 border-t border-[var(--vision-line)] pt-8 lg:border-0 lg:pt-0"
            aria-label="법적 안내 및 도움말"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--vision-muted)]">
              안내
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-[13px] font-medium">
              <Link
                href="/help"
                className="text-[var(--vision-accent-deep,#03a94d)] hover:underline"
              >
                FAQ·도움말
              </Link>
              <Link
                href="/terms"
                className="text-[var(--vision-accent-deep,#03a94d)] hover:underline"
              >
                이용약관
              </Link>
              <Link
                href="/privacy"
                className="text-[var(--vision-accent-deep,#03a94d)] hover:underline"
              >
                개인정보처리방침
              </Link>
              <Link
                href="/refund"
                className="text-[var(--vision-accent-deep,#03a94d)] hover:underline"
              >
                환불정책
              </Link>
              <a
                href="mailto:support@briclog.ai"
                className="text-[var(--vision-muted)] hover:text-[var(--vision-ink)] hover:underline"
              >
                support@briclog.ai
              </a>
            </div>
          </nav>
        </div>

        <p className="mt-10 border-t border-[var(--vision-line)] pt-6 text-center text-[11px] text-[var(--vision-muted)] lg:text-left">
          © 2026 BRICLOG · briclog.ai
        </p>
      </div>
    </footer>
  );
}
