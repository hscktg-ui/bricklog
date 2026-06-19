import { BRICLOG_SOCIAL_LINKS } from "@/lib/brand/socialLinks";
import { VISION_EYEBROW } from "@/lib/landing/vision2030Styles";

function NaverBlogIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
    >
      <rect width="20" height="20" rx="5" fill="#03C75A" />
      <path
        d="M5.5 14V6h2.4l2.1 4.8L12.1 6H14.5v8h-2.1V9.4L10.3 14H9.2L7.4 9.4V14H5.5Z"
        fill="#fff"
      />
    </svg>
  );
}

function InstagramIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
    >
      <rect
        x="1.5"
        y="1.5"
        width="17"
        height="17"
        rx="5"
        stroke="url(#briclog-insta-grad)"
        strokeWidth="1.6"
      />
      <circle cx="10" cy="10" r="3.6" stroke="url(#briclog-insta-grad)" strokeWidth="1.6" />
      <circle cx="14.8" cy="5.2" r="1.1" fill="url(#briclog-insta-grad)" />
      <defs>
        <linearGradient id="briclog-insta-grad" x1="2" y1="18" x2="18" y2="2">
          <stop stopColor="#F58529" />
          <stop offset="0.45" stopColor="#DD2A7B" />
          <stop offset="1" stopColor="#8134AF" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const PLATFORM_ICON = {
  naver: NaverBlogIcon,
  instagram: InstagramIcon,
};

const linkClass =
  "group inline-flex min-h-[44px] w-full items-center gap-3 rounded-2xl border border-[var(--vision-line-strong)] bg-[var(--vision-panel-bg,#fff)] px-4 py-3 text-[13px] font-semibold tracking-tight text-[var(--vision-ink)] shadow-[var(--vision-shadow-soft)] transition hover:border-[var(--vision-accent-ring,rgba(3,199,90,0.25))] hover:bg-[var(--vision-accent-soft,rgba(3,199,90,0.08))] active:scale-[0.99] sm:w-auto sm:min-w-[168px]";

/** Vision 2030 — 공식 채널 링크 (랜딩 푸터) */
export default function LandingFooterSocial() {
  return (
    <div className="border-t border-[var(--vision-line)] pt-6 sm:border-0 sm:pt-0">
      <p className={VISION_EYEBROW}>운영 채널</p>
      <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--vision-muted)]">
        실제로 쓰는 이야기·인스타를 구경해 보세요.
      </p>
      <ul
        className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap"
        aria-label="브릭로그 공식 채널"
      >
        {BRICLOG_SOCIAL_LINKS.map((item) => {
          const Icon = PLATFORM_ICON[item.platform];
          return (
            <li key={item.id} className="min-w-0">
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
                aria-label={`${item.label} (새 창)`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--vision-line)] bg-[var(--vision-paper)]">
                  <Icon />
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate">{item.label}</span>
                  <span className="mt-0.5 block text-[10px] font-medium text-[var(--vision-muted)] group-hover:text-[var(--vision-accent-deep,#03a94d)]">
                    @briclog{item.platform === "instagram" ? ".ai" : ""}
                  </span>
                </span>
                <span
                  className="shrink-0 text-[11px] text-[var(--vision-muted)] transition group-hover:text-[var(--vision-accent-deep,#03a94d)]"
                  aria-hidden
                >
                  ↗
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
