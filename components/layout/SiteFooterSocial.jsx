import { BRICLOG_SOCIAL_LINKS } from "@/lib/brand/socialLinks";

/** 법무·도움말 페이지 공통 푸터 — 간결한 채널 링크 */
export default function SiteFooterSocial() {
  return (
    <nav
      className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5"
      aria-label="공식 채널"
    >
      {BRICLOG_SOCIAL_LINKS.map((item) => (
        <a
          key={item.id}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[36px] items-center rounded-full border border-[var(--border)] px-3 py-1.5 text-[11px] font-semibold text-[var(--foreground)]/85 transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
        >
          {item.label}
          <span className="ml-1 text-[10px] opacity-50" aria-hidden>
            ↗
          </span>
        </a>
      ))}
    </nav>
  );
}
