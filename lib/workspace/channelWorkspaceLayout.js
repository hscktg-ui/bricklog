/** 채널 작업실 — 모바일(＜md) 스택 · 태블릿·PC(md+) 분할 SSOT */

export const CHANNEL_WORKSPACE_SHELL =
  "workspace-shell flex min-h-0 flex-1 flex-col overflow-hidden max-md:flex-col md:flex-row";

export const MOBILE_CHANNEL_COPY = {
  blog: {
    ariaLabel: "이야기 쓰기",
    form: { label: "입력", icon: "📝" },
    result: { label: "원고", icon: "✨" },
    busy: { label: "작성 중", icon: null },
    tagline: "브랜드 · 지역 · 주제",
  },
  place: {
    ariaLabel: "플레이스 작성",
    form: { label: "브리프", icon: "📍" },
    result: { label: "공지", icon: "✨" },
    busy: { label: "만드는 중", icon: null },
    tagline: "목표·사실 → 플레이스 공지",
  },
  insta: {
    ariaLabel: "인스타 캡션",
    form: { label: "브리프", icon: "📸" },
    result: { label: "캡션", icon: "✨" },
    busy: { label: "만드는 중", icon: null },
    tagline: "후크·톤 → 캡션·해시태그",
  },
};

/**
 * @param {object} opts
 * @param {boolean} [opts.hide]
 * @param {boolean} [opts.mobileIdleFull]
 * @param {"default"|"wide"} [opts.width]
 */
export function channelFormPaneClass(opts = {}) {
  const { hide = false, mobileIdleFull = false, width = "default" } = opts;
  const widthClass =
    width === "wide"
      ? "md:w-[min(380px,36vw)] md:max-w-[400px] lg:w-[min(400px,34vw)] lg:max-w-[420px]"
      : "md:w-[min(340px,34vw)] md:max-w-[380px] lg:w-[min(360px,32vw)] lg:max-w-[400px]";
  return [
    "flex min-h-0 w-full shrink-0 flex-col border-[var(--vision-line)] bg-white",
    widthClass,
    "md:border-r",
    hide ? "max-md:hidden" : "",
    mobileIdleFull
      ? "max-md:min-h-0 max-md:flex-1"
      : "max-md:max-h-[min(46dvh,420px)] max-md:border-b",
  ]
    .filter(Boolean)
    .join(" ");
}

export function channelFormScrollClass(formScrollPadClass = "", compact = false) {
  return [
    "min-h-0 flex-1 overflow-y-auto",
    formScrollPadClass,
    compact ? "p-3" : "p-4",
    "md:p-5 lg:p-6",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * @param {object} opts
 * @param {boolean} [opts.stickyCopy]
 * @param {boolean} [opts.hidden]
 * @param {string} [opts.resultScrollPadClass]
 */
export function channelResultPaneClass(opts = {}) {
  const { stickyCopy = false, hidden = false, resultScrollPadClass = "" } = opts;
  return [
    "workspace-result-scroll relative min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden",
    "bg-[var(--vision-paper)] p-4 md:p-6 lg:p-8",
    resultScrollPadClass,
    stickyCopy ? "has-sticky-copy" : "",
    hidden ? "max-md:hidden" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export const CHANNEL_MOBILE_CTA_FOOTER =
  "shrink-0 border-t border-[var(--vision-line)] bg-[var(--vision-glass-strong)] px-4 py-3 backdrop-blur-xl";

/** @returns {{ mobileIdleEmpty, showMobileChrome, hideFormPanel, mobileHideResults, mobilePane }} */
export function resolveChannelMobilePaneState({
  isMobile,
  hasContent,
  isGenerating,
  formOpen,
  hasFailureHint = false,
}) {
  const mobileIdleEmpty =
    isMobile && !hasContent && !isGenerating && !hasFailureHint;
  const showMobileChrome =
    isMobile && (hasContent || isGenerating || hasFailureHint);
  const hideFormPanel = isMobile && !formOpen && (hasContent || isGenerating);
  const mobileHideResults =
    isMobile && !hasFailureHint && !hasContent && !isGenerating && formOpen;
  const mobilePane = formOpen ? "form" : "result";
  return {
    mobileIdleEmpty,
    showMobileChrome,
    hideFormPanel,
    mobileHideResults,
    mobilePane,
  };
}
