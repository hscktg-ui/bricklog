/** Vision 2030 — 랜딩·인트로 공통 클래스 (Steve Jobs × 2030 editorial) */

export const VISION_PAGE = "briclog-vision-page min-h-[100dvh] text-[var(--vision-ink)]";

export const VISION_NAV =
  "briclog-vision-nav sticky top-0 z-30 px-4 pt-3 pb-2 md:px-8 md:pt-4";

export const VISION_NAV_INNER =
  "mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-full border border-[var(--vision-line)] bg-[var(--vision-glass)] px-4 py-2 shadow-[var(--vision-shadow-soft)] backdrop-blur-xl md:px-5 md:py-2.5";

export const VISION_EYEBROW =
  "text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--vision-muted)]";

export const VISION_HEADLINE =
  "text-[clamp(2rem,6vw,3.5rem)] font-semibold leading-[1.08] tracking-[-0.035em] text-[var(--vision-ink)]";

export const VISION_SUB =
  "text-[17px] leading-[1.55] text-[var(--vision-muted)] md:text-[19px]";

export const VISION_SECTION =
  "border-t border-[var(--vision-line)] bg-[var(--vision-paper)]";

export const VISION_SECTION_DARK =
  "briclog-vision-footer-cta border-t border-white/10 bg-[#050506] text-white lg:bg-[var(--vision-ink)]";

export const VISION_PANEL =
  "overflow-hidden rounded-[1.75rem] border border-[var(--vision-line)] bg-[var(--vision-panel-bg,#fff)] shadow-[var(--vision-shadow-panel)]";

export const VISION_GLASS_CARD =
  "rounded-[1.5rem] border border-[var(--vision-line)] bg-[var(--vision-glass-strong)] shadow-[var(--vision-shadow-soft)] backdrop-blur-xl";

export const VISION_CTA_PRIMARY =
  "relative inline-flex min-h-[52px] w-full items-center justify-center rounded-full bg-[var(--vision-ink)] px-8 text-[15px] font-semibold tracking-tight text-white shadow-[0_12px_40px_rgba(5,5,6,0.18)] transition hover:bg-[#1d1d1f] active:scale-[0.99] disabled:opacity-50 sm:w-auto";

export const VISION_CTA_ACCENT =
  "relative inline-flex min-h-[52px] w-full items-center justify-center rounded-full bg-[var(--vision-accent)] px-8 text-[15px] font-semibold tracking-tight text-[#041208] shadow-[0_12px_36px_rgba(48,209,88,0.35)] transition hover:brightness-105 active:scale-[0.99] disabled:opacity-50 sm:w-auto";

export const VISION_CTA_GHOST =
  "relative inline-flex min-h-[48px] w-full items-center justify-center rounded-full border border-[var(--vision-line-strong)] bg-[var(--vision-panel-bg,rgba(255,255,255,0.6))] px-7 text-[14px] font-semibold text-[var(--vision-ink)] backdrop-blur-sm transition hover:brightness-110 active:scale-[0.99] sm:w-auto";

export const VISION_INPUT =
  "mt-2 w-full min-h-[50px] rounded-2xl border border-[var(--vision-line)] bg-[var(--vision-panel-bg,#fff)] px-4 text-[16px] text-[var(--vision-ink)] outline-none transition placeholder:text-[var(--vision-muted)] focus:border-[var(--vision-accent)] focus:ring-4 focus:ring-[rgba(48,209,88,0.15)]";

/** 로그인 후 작업실 — 랜딩과 동일 토큰 */
export const VISION_WORKSPACE =
  "briclog-vision-workspace min-h-0 flex-1 text-[var(--vision-ink)]";

export const VISION_WORKSPACE_CANVAS = "bg-[var(--vision-paper)]";

export const VISION_WORKSPACE_PANEL =
  "rounded-[1.25rem] border border-[var(--vision-line)] bg-[var(--vision-panel-bg,#fff)] shadow-[var(--vision-shadow-soft)]";

export const VISION_TAB_ACTIVE =
  "bg-[var(--vision-ink)] text-white shadow-[var(--vision-shadow-soft)]";

export const VISION_TAB_IDLE =
  "text-[var(--vision-muted)] hover:bg-[var(--vision-panel-bg,rgba(255,255,255,0.8))] hover:text-[var(--vision-ink)]";

export const VISION_NAV_ITEM_ACTIVE =
  "bg-[var(--vision-ink)] text-white shadow-sm";

export const VISION_NAV_ITEM_IDLE =
  "text-[var(--vision-muted)] hover:bg-[var(--vision-panel-bg,rgba(255,255,255,0.6))] hover:text-[var(--vision-ink)]";

export const VISION_DEVICE_TAB_ACTIVE =
  "bg-[var(--vision-ink)] text-white shadow-[var(--vision-shadow-soft)] ring-1 ring-[var(--vision-line)]";

export const VISION_DEVICE_TAB_IDLE =
  "text-[var(--vision-muted)] hover:bg-[var(--vision-panel-bg,#fff)] hover:text-[var(--vision-ink)]";

/** 결과·복사 히어로 — 발행 준비 블록 */
export const VISION_RESULT_HERO =
  "overflow-hidden rounded-[1.25rem] border border-[rgba(48,209,88,0.14)] bg-[linear-gradient(180deg,rgba(48,209,88,0.1)_0%,var(--vision-panel-bg,#fff)_48%)] shadow-[var(--vision-shadow-soft)]";

export const VISION_LOADING_PANEL =
  "overflow-hidden rounded-[1.5rem] border border-[var(--vision-line)] bg-[var(--vision-glass-strong)] shadow-[var(--vision-shadow-panel)] backdrop-blur-xl";

export const VISION_SPINNER =
  "mx-auto h-9 w-9 animate-spin rounded-full border-2 border-[var(--vision-line)] border-t-[var(--vision-accent)]";

export const VISION_PROGRESS_TRACK =
  "h-1.5 overflow-hidden rounded-full bg-[var(--vision-paper)]";

export const VISION_PROGRESS_FILL =
  "h-full rounded-full bg-[var(--vision-accent)] transition-all duration-700 ease-out";

export const VISION_COPY_BTN =
  "briclog-pressable inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-[var(--vision-line-strong)] bg-white px-4 py-2 text-[13px] font-semibold text-[var(--vision-ink)] shadow-[var(--vision-shadow-soft)] transition hover:border-[rgba(48,209,88,0.35)] hover:bg-[rgba(48,209,88,0.08)] disabled:opacity-50";

export const VISION_GHOST_BTN =
  "briclog-pressable inline-flex min-h-[40px] items-center justify-center rounded-full border border-[var(--vision-line-strong)] bg-[var(--vision-panel-bg,rgba(255,255,255,0.8))] px-4 py-2 text-[12px] font-semibold text-[var(--vision-muted)] transition hover:brightness-110 hover:text-[var(--vision-ink)] disabled:opacity-50";

export const VISION_STATUS_OK =
  "rounded-xl border border-[rgba(48,209,88,0.22)] bg-[rgba(48,209,88,0.08)]";

export const VISION_STATUS_NEUTRAL =
  "rounded-xl border border-[var(--vision-line)] bg-[var(--vision-panel-bg,#fff)]";

export const VISION_STATUS_WARN =
  "rounded-xl border border-[#FFE0B2] bg-[#FFF8E6]";

export const VISION_CHIP_ACTIVE =
  "border-[rgba(48,209,88,0.35)] bg-[rgba(48,209,88,0.1)] text-[var(--vision-ink)] ring-1 ring-[rgba(48,209,88,0.2)]";

export const VISION_CHIP_IDLE =
  "border-[var(--vision-line)] bg-[var(--vision-panel-bg,#fff)] text-[var(--vision-muted)] hover:border-[rgba(48,209,88,0.25)]";

export const VISION_FORM_FIELD =
  "w-full rounded-xl border border-[var(--vision-line)] bg-[var(--vision-panel-bg,#fff)] px-3 py-2.5 text-[14px] leading-relaxed text-[var(--vision-ink)] focus:border-[var(--vision-accent)] focus:outline-none focus:ring-4 focus:ring-[rgba(48,209,88,0.12)]";

export const VISION_FORM_PANEL =
  "rounded-xl border border-[var(--vision-line)] bg-[var(--vision-paper)] p-3";

export const VISION_TOOLBAR_BTN =
  "flex items-center gap-1.5 rounded-full border border-[var(--vision-line-strong)] bg-[var(--vision-panel-bg,#fff)] px-3 py-2 text-[12px] font-semibold text-[var(--vision-muted)] shadow-[var(--vision-shadow-soft)] hover:text-[var(--vision-ink)] disabled:opacity-50";

export const VISION_TOOLBAR_BTN_ACCENT =
  "flex items-center gap-1.5 rounded-full border border-[rgba(48,209,88,0.3)] bg-[rgba(48,209,88,0.08)] px-3 py-2 text-[12px] font-semibold text-[var(--vision-ink)] hover:bg-[rgba(48,209,88,0.14)] disabled:opacity-50";
