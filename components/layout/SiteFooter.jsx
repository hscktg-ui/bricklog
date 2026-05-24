import Link from "next/link";
import { BRICLOG_CONTACT_EMAIL, BRICLOG_CONTACT_LABEL } from "@/lib/brand/support";
import { SITE_FOOTER_TAGLINE } from "@/lib/brand/slogan";

const LEGAL_LINKS = [
  { href: "/terms", label: "이용약관" },
  { href: "/privacy", label: "개인정보처리방침" },
  { href: "/refund", label: "환불정책" },
];

export default function SiteFooter() {
  return (
    <footer
      className="shrink-0 border-t border-[var(--border)] bg-[var(--footer-bg,var(--background))] text-[var(--foreground)]"
      role="contentinfo"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 md:flex-row md:items-end md:justify-between md:px-8">
        <div>
          <p className="text-[14px] font-bold text-[var(--foreground)]">BRICLOG</p>
          <p className="mt-1 text-[12px] text-[var(--muted)]">{SITE_FOOTER_TAGLINE}</p>
          <p className="mt-3 text-[11px] leading-relaxed text-[var(--muted)]">
            해신 · 대표 김태규 · 116-06-68724
            <span className="mx-1.5 text-[var(--border)]" aria-hidden>
              ·
            </span>
            2023-경기파주-2430
          </p>
        </div>

        <div className="flex flex-col gap-2 md:items-end">
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
