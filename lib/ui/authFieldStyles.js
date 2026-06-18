/** 로그인·가입 — Vision 2030 토큰 (랜딩·작업실과 동일 팔레트) */
export const AUTH_VISION_SCOPE_CLASS = "briclog-auth-vision";

export const AUTH_FIELD_CLASS =
  "briclog-auth-field w-full min-w-0 rounded-2xl border border-[var(--vision-line,rgba(15,26,20,0.08))] bg-[var(--vision-panel-bg,#fff)] px-4 py-3 text-[16px] leading-normal text-[var(--vision-ink,#0f1a14)] placeholder:text-[var(--vision-muted,#5a6b62)] outline-none transition focus:border-[var(--vision-accent,#03c75a)] focus:ring-4 focus:ring-[var(--vision-accent-ring,rgba(3,199,90,0.15))] sm:py-2.5 sm:text-[14px]";

export const AUTH_FIELD_ERROR_CLASS =
  "border-[#E42939] focus:border-[#E42939] focus:ring-[#E42939]/15";

export const AUTH_SURFACE_CLASS =
  "briclog-auth-surface text-[var(--vision-ink,#0f1a14)]";

export const AUTH_MOBILE_SHELL_CLASS =
  "w-full max-w-md rounded-[1.75rem] border border-[var(--vision-line,rgba(15,26,20,0.08))] bg-[var(--vision-panel-bg,#fff)] p-4 shadow-[var(--vision-shadow-panel,0_24px_80px_rgba(15,26,20,0.08))] sm:p-6";

export const AUTH_MOBILE_PAGE_CLASS =
  `${AUTH_VISION_SCOPE_CLASS} briclog-vision-page flex min-h-[100dvh] items-center justify-center bg-[var(--vision-paper,#f7faf8)] px-4 py-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-4`;

export const AUTH_PRIMARY_BTN_CLASS =
  "briclog-auth-primary briclog-no-slab w-full min-h-[52px] rounded-full bg-[var(--vision-accent,#03c75a)] py-3 text-[15px] font-semibold tracking-tight text-white shadow-[0_12px_36px_rgba(3,199,90,0.32)] transition hover:brightness-105 active:scale-[0.99] disabled:opacity-65 sm:text-[14px]";

export const AUTH_SECONDARY_BTN_CLASS =
  "rounded-lg border border-[var(--vision-accent-ring,rgba(3,199,90,0.35))] bg-[var(--vision-accent-soft,rgba(3,199,90,0.08))] px-3 py-1.5 font-semibold text-[var(--vision-accent-deep,#03a94d)] transition hover:brightness-[0.97] active:scale-[0.99]";
