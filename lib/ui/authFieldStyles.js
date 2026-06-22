/** 로그인·가입 — Vision 2030 토큰 (랜딩·작업실과 동일 팔레트) */
export const AUTH_VISION_SCOPE_CLASS = "briclog-auth-vision";

export const AUTH_EYEBROW =
  "text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--vision-muted,#5a6b62)]";

export const AUTH_TITLE =
  "text-[clamp(1.25rem,4vw,1.5rem)] font-semibold tracking-[-0.03em] text-[var(--vision-ink,#0f1a14)]";

export const AUTH_FIELD_CLASS =
  "briclog-auth-field w-full min-w-0 rounded-2xl border border-[var(--vision-line,rgba(15,26,20,0.08))] bg-[var(--vision-panel-bg,#fff)] px-4 py-3 text-[16px] leading-normal text-[var(--vision-ink,#0f1a14)] placeholder:text-[var(--vision-muted,#5a6b62)] outline-none transition focus:border-[var(--vision-accent,#03c75a)] focus:ring-4 focus:ring-[var(--vision-accent-ring,rgba(3,199,90,0.15))] sm:py-2.5 sm:text-[14px]";

export const AUTH_FIELD_ERROR_CLASS =
  "border-[#E42939] focus:border-[#E42939] focus:ring-[#E42939]/15";

export const AUTH_SURFACE_CLASS =
  "briclog-auth-surface text-[var(--vision-ink,#0f1a14)]";

export const AUTH_SHELL_CLASS =
  "w-full rounded-[1.75rem] border border-[var(--vision-line,rgba(15,26,20,0.08))] bg-[var(--vision-panel-bg,#fff)] p-5 shadow-[var(--vision-shadow-panel,0_24px_80px_rgba(15,26,20,0.08))] sm:p-7";

export const AUTH_MOBILE_SHELL_CLASS = AUTH_SHELL_CLASS;

export const AUTH_MOBILE_PAGE_CLASS =
  `${AUTH_VISION_SCOPE_CLASS} briclog-vision-page flex min-h-[100dvh] items-center justify-center bg-[var(--vision-paper,#f7faf8)] px-4 py-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6`;

export const AUTH_MODE_SEGMENT_SHELL =
  "grid grid-cols-2 gap-1 rounded-full border border-[var(--vision-line,rgba(15,26,20,0.08))] bg-[var(--vision-paper,#f7faf8)] p-1";

export const AUTH_MODE_SEGMENT_ACTIVE =
  "min-h-[44px] rounded-full bg-[var(--vision-ink,#0f1a14)] px-3 text-[13px] font-semibold text-white shadow-[var(--vision-shadow-soft,0_8px_24px_rgba(15,26,20,0.12))] transition";

export const AUTH_MODE_SEGMENT_IDLE =
  "min-h-[44px] rounded-full px-3 text-[13px] font-semibold text-[var(--vision-muted,#5a6b62)] transition hover:text-[var(--vision-ink,#0f1a14)]";

export const AUTH_TRUST_PANEL =
  "rounded-2xl border border-[var(--vision-accent-ring,rgba(3,199,90,0.22))] bg-[linear-gradient(180deg,var(--vision-accent-soft,rgba(3,199,90,0.1))_0%,var(--vision-panel-bg,#fff)_55%)] px-4 py-3.5";

export const AUTH_STEP_PILL =
  "inline-flex items-center rounded-full border border-[var(--vision-line,rgba(15,26,20,0.08))] bg-[var(--vision-panel-bg,#fff)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--vision-muted,#5a6b62)]";

export const AUTH_STEP_PILL_ACTIVE =
  "border-[var(--vision-accent-ring,rgba(3,199,90,0.35))] bg-[var(--vision-accent-soft,rgba(3,199,90,0.1))] text-[var(--vision-ink,#0f1a14)]";

export const AUTH_PRIMARY_BTN_CLASS =
  "briclog-auth-primary briclog-no-slab w-full min-h-[52px] rounded-full bg-[var(--vision-accent,#03c75a)] py-3 text-[15px] font-semibold tracking-tight text-white shadow-[0_12px_36px_rgba(3,199,90,0.32)] transition hover:brightness-105 active:scale-[0.99] disabled:opacity-65 sm:text-[14px]";

export const AUTH_SECONDARY_BTN_CLASS =
  "rounded-full border border-[var(--vision-line-strong,rgba(15,26,20,0.14))] bg-[var(--vision-panel-bg,#fff)] px-4 py-2 text-[13px] font-semibold text-[var(--vision-muted,#5a6b62)] transition hover:border-[var(--vision-accent-ring,rgba(3,199,90,0.35))] hover:text-[var(--vision-ink,#0f1a14)] active:scale-[0.99]";

export const AUTH_CHECKBOX_CLASS =
  "rounded border-[var(--vision-line,rgba(15,26,20,0.08))] text-[var(--vision-accent,#03c75a)]";

export const AUTH_MUTED_TEXT_CLASS = "text-[var(--vision-muted,#5a6b62)]";

export const AUTH_LINK_CLASS =
  "font-semibold text-[var(--vision-accent-deep,#03a94d)] hover:underline";

export const AUTH_WARN_SURFACE_CLASS =
  "rounded-2xl border border-[#FFE8CC] bg-[#FFF9F0] px-3 py-2.5 text-center text-[12px] leading-relaxed text-[#8B5A00]";

export const AUTH_ERROR_SURFACE_CLASS =
  "rounded-2xl bg-[#FFF5F5] px-3 py-2.5 text-center text-[12px] text-[#E42939]";

export const AUTH_LABEL_CLASS =
  "mb-1.5 block text-[13px] font-semibold text-[var(--vision-ink,#0f1a14)] sm:text-[12px]";

export const AUTH_CLOSE_BTN_CLASS =
  "absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--vision-line,rgba(15,26,20,0.08))] bg-[var(--vision-panel-bg,#fff)] text-[var(--vision-muted,#5a6b62)] shadow-[var(--vision-shadow-soft,0_4px_16px_rgba(15,26,20,0.06))] transition hover:text-[var(--vision-ink,#0f1a14)]";
