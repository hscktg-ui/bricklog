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
  "briclog-vision-footer-cta border-t border-[var(--vision-line)] bg-[var(--vision-ink)] text-[var(--vision-paper)] lg:bg-[linear-gradient(180deg,#0f1a14_0%,#071510_100%)]";

export const VISION_PANEL =
  "overflow-hidden rounded-[1.75rem] border border-[var(--vision-line)] bg-[var(--vision-panel-bg,#fff)] shadow-[var(--vision-shadow-panel)]";

export const VISION_GLASS_CARD =
  "rounded-[1.5rem] border border-[var(--vision-line)] bg-[var(--vision-glass-strong)] shadow-[var(--vision-shadow-soft)] backdrop-blur-xl";

export const VISION_CTA_PRIMARY =
  "relative inline-flex min-h-[52px] w-full items-center justify-center rounded-full bg-[var(--vision-accent-deep,#03a94d)] px-8 text-[15px] font-semibold tracking-tight text-white shadow-[0_12px_40px_rgba(3,169,77,0.22)] transition hover:bg-[var(--vision-accent)] active:scale-[0.99] disabled:opacity-50 sm:w-auto";

export const VISION_CTA_ACCENT =
  "relative inline-flex min-h-[52px] w-full items-center justify-center rounded-full bg-[var(--vision-accent)] px-8 text-[15px] font-semibold tracking-tight text-white shadow-[0_12px_36px_rgba(3,199,90,0.32)] transition hover:brightness-105 active:scale-[0.99] disabled:opacity-50 sm:w-auto";

export const VISION_CTA_GHOST =
  "relative inline-flex min-h-[48px] w-full items-center justify-center rounded-full border border-[var(--vision-line-strong)] bg-[var(--vision-btn-ghost-bg,var(--vision-glass-strong))] px-7 text-[14px] font-semibold text-[var(--vision-ink)] shadow-[var(--vision-shadow-soft)] backdrop-blur-sm transition hover:bg-[var(--vision-btn-surface-hover,rgba(3,199,90,0.14))] active:scale-[0.99] sm:w-auto";

/** 모바일·태블릿 — 보조 CTA (고객 화면에서는 lg+ 에서만 노출 권장) */
export const VISION_CTA_GHOST_SUBTLE =
  "relative hidden min-h-[48px] w-full items-center justify-center rounded-full border border-[var(--vision-line-strong)] bg-transparent px-7 text-[14px] font-semibold text-[var(--vision-muted)] transition hover:border-[var(--vision-accent-ring)] hover:text-[var(--vision-ink)] active:scale-[0.99] lg:inline-flex lg:bg-[var(--vision-btn-ghost-bg)] lg:text-[var(--vision-ink)] lg:shadow-[var(--vision-shadow-soft)] lg:backdrop-blur-sm lg:hover:bg-[var(--vision-btn-surface-hover)] sm:w-auto";

export const VISION_MOBILE_SEGMENT_ACTIVE =
  "bg-[var(--vision-accent-deep,#03a94d)] text-white shadow-[0_4px_16px_rgba(3,169,77,0.28)] ring-1 ring-[var(--vision-accent-ring,rgba(3,199,90,0.35))]";

export const VISION_MOBILE_SEGMENT_IDLE =
  "text-[var(--vision-muted)] hover:bg-[var(--vision-btn-ghost-bg,rgba(3,199,90,0.06))] hover:text-[var(--vision-ink)]";

export const VISION_INPUT =
  "mt-2 w-full min-h-[50px] rounded-2xl border border-[var(--vision-line)] bg-[var(--vision-panel-bg,#fff)] px-4 text-[16px] text-[var(--vision-ink)] outline-none transition placeholder:text-[var(--vision-muted)] focus:border-[var(--vision-accent)] focus:ring-4 focus:ring-[var(--vision-accent-ring,rgba(3,199,90,0.15))]";

/** 로그인 후 작업실 — 랜딩과 동일 토큰 */
export const VISION_WORKSPACE =
  "briclog-vision-workspace min-h-0 flex-1 text-[var(--vision-ink)]";

export const VISION_WORKSPACE_CANVAS = "bg-[var(--vision-paper)]";

export const VISION_WORKSPACE_PANEL =
  "rounded-[1.25rem] border border-[var(--vision-line)] bg-[var(--vision-panel-bg,#fff)] shadow-[var(--vision-shadow-soft)]";

export const VISION_TAB_ACTIVE =
  "bg-[var(--vision-tab-active-bg,var(--vision-ink))] text-[var(--vision-tab-active-fg,#fff)] shadow-[var(--vision-shadow-soft)]";

export const VISION_TAB_IDLE =
  "text-[var(--vision-muted)] hover:bg-[var(--vision-panel-bg,rgba(255,255,255,0.8))] hover:text-[var(--vision-ink)]";

export const VISION_NAV_ITEM_ACTIVE =
  "bg-[var(--vision-tab-active-bg,var(--vision-ink))] text-[var(--vision-tab-active-fg,#fff)] shadow-sm";

export const VISION_NAV_ITEM_IDLE =
  "text-[var(--vision-muted)] hover:bg-[var(--vision-panel-bg,rgba(255,255,255,0.6))] hover:text-[var(--vision-ink)]";

export const VISION_DEVICE_TAB_ACTIVE =
  "bg-[var(--vision-tab-active-bg,var(--vision-ink))] text-[var(--vision-tab-active-fg,#fff)] shadow-[var(--vision-shadow-soft)] ring-1 ring-[var(--vision-line)]";

/** lg 미만 — 폰·패드·PC 미리보기 토글 숨김 (실제 기기 그대로) */
export const VISION_DESKTOP_ONLY = "hidden lg:inline-flex";

export const VISION_DEVICE_TAB_IDLE =
  "text-[var(--vision-muted)] hover:bg-[var(--vision-panel-bg,#fff)] hover:text-[var(--vision-ink)]";

/** 결과·복사 히어로 — 발행 준비 블록 */
export const VISION_RESULT_HERO =
  "overflow-hidden rounded-[1.25rem] border border-[var(--vision-accent-ring,rgba(3,199,90,0.18))] bg-[linear-gradient(180deg,var(--vision-accent-soft,rgba(3,199,90,0.1))_0%,var(--vision-panel-bg,#fff)_48%)] shadow-[var(--vision-shadow-soft)]";

export const VISION_LOADING_PANEL =
  "overflow-hidden rounded-[1.5rem] border border-[var(--vision-line)] bg-[var(--vision-glass-strong)] shadow-[var(--vision-shadow-panel)] backdrop-blur-xl";

export const VISION_SPINNER =
  "mx-auto h-9 w-9 animate-spin rounded-full border-2 border-[var(--vision-line)] border-t-[var(--vision-accent)]";

export const VISION_PROGRESS_TRACK =
  "h-1.5 overflow-hidden rounded-full bg-[var(--vision-paper)]";

export const VISION_PROGRESS_FILL =
  "h-full rounded-full bg-[var(--vision-accent)] transition-all duration-700 ease-out";

export const VISION_COPY_BTN =
  "briclog-pressable inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-[var(--vision-accent-ring,rgba(3,199,90,0.28))] bg-[var(--vision-btn-surface,rgba(3,199,90,0.1))] px-4 py-2 text-[13px] font-semibold text-[var(--vision-ink)] shadow-[var(--vision-shadow-soft)] transition hover:border-[var(--vision-accent)] hover:bg-[var(--vision-btn-surface-hover,rgba(3,199,90,0.16))] disabled:opacity-50";

export const VISION_GHOST_BTN =
  "briclog-pressable inline-flex min-h-[40px] items-center justify-center rounded-full border border-[var(--vision-line-strong)] bg-[var(--vision-btn-ghost-bg,rgba(3,199,90,0.08))] px-4 py-2 text-[12px] font-semibold text-[var(--vision-ink)] shadow-[var(--vision-shadow-soft)] transition hover:border-[var(--vision-accent-ring,rgba(3,199,90,0.35))] hover:bg-[var(--vision-btn-surface-hover,rgba(3,199,90,0.14))] disabled:opacity-50";

/** 인트로 하단 CTA — 단일 버튼(대기 중: 바로 보기 → 완료 후: 시작하기) */
export const VISION_INTRO_CTA =
  "relative z-20 inline-flex min-h-[52px] w-full max-w-[280px] items-center justify-center rounded-full bg-[var(--vision-accent)] px-8 text-[15px] font-semibold tracking-tight text-white shadow-[0_12px_36px_rgba(3,199,90,0.32)] transition hover:brightness-105 active:scale-[0.99] disabled:opacity-50 sm:max-w-none sm:min-w-[220px]";

/** 로그인 — accent CTA와 겹치지 않는 텍스트 링크 (nav · hero · sticky) */
export const VISION_LOGIN_LINK =
  "inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-full px-3 py-2 text-[13px] font-semibold text-[var(--vision-muted)] underline-offset-4 transition hover:text-[var(--vision-ink)] hover:underline active:opacity-80 sm:text-[14px]";

/** @deprecated 상단 skip — 하단 단일 CTA로 대체. E2E·레거시 참조용 */
export const VISION_INTRO_SKIP = VISION_INTRO_CTA;

export const VISION_STATUS_OK =
  "rounded-xl border border-[var(--vision-accent-ring,rgba(3,199,90,0.22))] bg-[var(--vision-accent-soft,rgba(3,199,90,0.08))]";

export const VISION_STATUS_NEUTRAL =
  "rounded-xl border border-[var(--vision-line)] bg-[var(--vision-panel-bg,#fff)]";

export const VISION_STATUS_WARN =
  "rounded-xl border border-[#FFE0B2] bg-[#FFF8E6]";

/** 생성 실패·재시도 — 중립 톤 (성공 녹색과 혼동 방지) */
export const VISION_HINT_PANEL =
  "rounded-2xl border border-[var(--vision-line)] bg-[var(--vision-panel-bg,#fff)] px-5 py-5 text-center shadow-[var(--vision-shadow-soft)] sm:px-6 sm:py-6";

export const VISION_CHIP_ACTIVE =
  "border-[var(--vision-accent-ring,rgba(3,199,90,0.35))] bg-[var(--vision-accent-soft,rgba(3,199,90,0.1))] text-[var(--vision-ink)] ring-1 ring-[var(--vision-accent-ring,rgba(3,199,90,0.2))]";

export const VISION_CHIP_IDLE =
  "border-[var(--vision-line)] bg-[var(--vision-panel-bg,#fff)] text-[var(--vision-muted)] hover:border-[var(--vision-accent-ring,rgba(3,199,90,0.25))]";

export const VISION_FORM_FIELD =
  "w-full rounded-xl border border-[var(--vision-line)] bg-[var(--vision-panel-bg,#fff)] px-3 py-2.5 text-[14px] leading-relaxed text-[var(--vision-ink)] focus:border-[var(--vision-accent)] focus:outline-none focus:ring-4 focus:ring-[var(--vision-accent-ring,rgba(3,199,90,0.12))]";

export const VISION_FORM_PANEL =
  "rounded-xl border border-[var(--vision-line)] bg-[var(--vision-paper)] p-3";

export const VISION_TOOLBAR_BTN =
  "flex items-center gap-1.5 rounded-full border border-[var(--vision-line-strong)] bg-[var(--vision-btn-ghost-bg,rgba(3,199,90,0.08))] px-3 py-2 text-[12px] font-semibold text-[var(--vision-muted)] shadow-[var(--vision-shadow-soft)] hover:border-[var(--vision-accent-ring,rgba(3,199,90,0.3))] hover:text-[var(--vision-ink)] disabled:opacity-50";

export const VISION_TOOLBAR_BTN_ACCENT =
  "flex items-center gap-1.5 rounded-full border border-[var(--vision-accent-ring,rgba(3,199,90,0.3))] bg-[var(--vision-accent-soft,rgba(3,199,90,0.08))] px-3 py-2 text-[12px] font-semibold text-[var(--vision-ink)] hover:bg-[var(--vision-accent-soft,rgba(3,199,90,0.14))] disabled:opacity-50";
