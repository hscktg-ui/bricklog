import Link from "next/link";
import { BRICLOG_CONTACT_EMAIL, BRICLOG_CONTACT_LABEL } from "@/lib/brand/support";
import {
  BRAND_META_TITLE_KO,
  SITE_FOOTER_TAGLINE,
} from "@/lib/brand/copy";
import SiteFooterSocial from "@/components/layout/SiteFooterSocial";

const LEGAL_LINKS = [
  { href: "/guides", label: "콘텐츠 가이드" },
  { href: "/help", label: "도움말·FAQ" },
  { href: "/terms", label: "이용약관" },
  { href: "/privacy", label: "개인정보처리방침" },
  { href: "/refund", label: "환불정책" },
];

/** Vision 2040 footer — one slogan · no EN echo */
export default function SiteFooter() {
  return (
    <footer
      className="shrink-0 border-t border-[var(--border)] bg-[var(--footer-bg,var(--background))] text-[var(--foreground)]"
      role="contentinfo"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 md:flex-row md:items-end md:justify-between md:px-8">
        <div className="max-w-xl">
          <p className="text-[12px] font-semibold text-[var(--brand)]">
            Intent before output
          </p>
          <p className="mt-3 text-[22px] font-semibold leading-snug tracking-[-0.01em] text-[var(--foreground)]">
            {BRAND_META_TITLE_KO}
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-[var(--foreground)]/88">
            {SITE_FOOTER_TAGLINE}
          </p>
          <p className="mt-5 text-[11px] leading-relaxed text-[var(--muted)]">
            해신 · 대표 김태규 · 116-06-68724
            <span className="mx-1.5 text-[var(--border)]" aria-hidden>
              ·
            </span>
            2023-경기파주-2430
          </p>
        </div>

        <div className="flex flex-col gap-3 md:items-end">
          <p className="text-[12px] text-[var(--muted)]">
            <a
              href={`mailto:${BRICLOG_CONTACT_EMAIL}`}
              className="font-medium text-[var(--foreground)]/90 hover:text-[var(--brand)] hover:underline underline-offset-4"
            >
              {BRICLOG_CONTACT_LABEL}
            </a>
            <span className="mx-1.5 text-[var(--border)]" aria-hidden>
              ·
            </span>
            <a
              href={`mailto:${BRICLOG_CONTACT_EMAIL}`}
              className="hover:text-[var(--brand)] hover:underline underline-offset-4"
            >
              {BRICLOG_CONTACT_EMAIL}
            </a>
          </p>
          <SiteFooterSocial />
          <nav
            className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] font-medium"
            aria-label="법적 고지"
          >
            {LEGAL_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-[var(--foreground)]/80 hover:text-[var(--brand)] hover:underline underline-offset-4"
              >
                {label}
              </Link>
            ))}
          </nav>
          <p className="text-[11px] text-[var(--muted)]">© 2026 BRICLOG</p>
        </div>
      </div>
    </footer>
  );
}
