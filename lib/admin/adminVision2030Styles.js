/** Vision 2030 — Admin system console (editorial · readable · growth-aware)
 * 공개 홈(--vision-*)과 잉크·페이퍼·액센트를 수렴한다.
 */

export const ADMIN_PAGE =
  "briclog-admin-page min-h-screen bg-[var(--admin-paper,#FCFCFA)] text-[var(--admin-ink,#111111)]";

export const ADMIN_INNER = "mx-auto max-w-6xl px-4 pb-10 pt-5 md:px-6 md:pb-12 md:pt-8";

export const ADMIN_GATE =
  "min-h-[100dvh] bg-[var(--admin-paper,#FCFCFA)] px-4 py-8 text-[var(--admin-ink,#111111)] sm:px-6";

export const ADMIN_GATE_PANEL =
  "mx-auto max-w-md overflow-hidden rounded-[1.75rem] border border-[var(--admin-line,rgba(17,17,17,0.08))] bg-[var(--admin-panel,#fff)] p-6 shadow-[var(--admin-shadow-panel,0_24px_80px_rgba(17,17,17,0.08))] sm:p-8";

export const ADMIN_EYEBROW =
  "text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--admin-muted,#5F6B66)]";

export const ADMIN_HEADLINE =
  "text-[clamp(1.5rem,4vw,2rem)] font-semibold tracking-[-0.04em] text-[var(--admin-ink,#111111)]";

export const ADMIN_SUB =
  "text-[14px] leading-relaxed text-[var(--admin-muted,#5F6B66)]";

export const ADMIN_PANEL =
  "overflow-hidden rounded-[1.5rem] border border-[var(--admin-line,rgba(17,17,17,0.08))] bg-[var(--admin-panel,#fff)] shadow-[var(--admin-shadow-soft,0_8px_32px_rgba(17,17,17,0.05))]";

export const ADMIN_SECTION_NAV =
  "sticky top-0 z-20 -mx-4 mb-6 flex gap-1.5 overflow-x-auto border-b border-[var(--admin-line,rgba(17,17,17,0.08))] bg-[var(--admin-paper,#FCFCFA)]/92 px-4 py-3 backdrop-blur-xl [-ms-overflow-style:none] [scrollbar-width:none] md:static md:mx-0 md:flex-wrap md:overflow-visible md:rounded-2xl md:border md:p-1.5 [&::-webkit-scrollbar]:hidden";

export const ADMIN_TAB_ACTIVE =
  "shrink-0 rounded-full bg-[var(--admin-ink,#111111)] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_16px_rgba(17,17,17,0.12)]";

export const ADMIN_TAB_IDLE =
  "shrink-0 rounded-full px-4 py-2.5 text-[13px] font-semibold text-[var(--admin-muted,#5F6B66)] transition hover:bg-[var(--admin-accent-soft,rgba(3,199,90,0.08))] hover:text-[var(--admin-ink,#111111)]";

export const ADMIN_CTA_ACCENT =
  "inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-[var(--admin-accent-deep,#03a94d)] px-5 text-[14px] font-semibold text-white shadow-[0_8px_24px_rgba(3,169,77,0.22)] transition hover:brightness-105 active:scale-[0.99] disabled:opacity-50 sm:w-auto";

export const ADMIN_LINK =
  "text-[13px] font-semibold text-[var(--admin-accent-deep,#03a94d)] underline-offset-4 transition hover:underline";

export const ADMIN_GHOST_BTN =
  "inline-flex min-h-[40px] items-center justify-center rounded-full border border-[var(--admin-line-strong,rgba(17,17,17,0.14))] bg-[var(--admin-panel,#fff)] px-4 text-[13px] font-semibold text-[var(--admin-ink,#111111)] shadow-[var(--admin-shadow-soft,0_8px_32px_rgba(17,17,17,0.05))] transition hover:border-[var(--admin-accent-ring,rgba(3,199,90,0.25))] hover:bg-[var(--admin-accent-soft,rgba(3,199,90,0.08))]";

export const ADMIN_SIGNAL_ACCENT =
  "rounded-2xl border border-[var(--admin-accent-ring,rgba(3,199,90,0.28))] bg-[var(--admin-accent-soft,rgba(3,199,90,0.08))] px-3 py-2.5";
