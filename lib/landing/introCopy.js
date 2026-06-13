import { BRICLOG_SLOGAN } from "@/lib/brand/copy";

/** useIntroRevealTypewriter — 빈 lines 안정 참조 */
export const INTRO_LINES_NONE = [];

/** 메모장 1~4줄 타이핑·지우기 */
export const LANDING_INTRO_LINES = [
  "오늘도 망설이고 계신가요?",
  "브랜드는 텍스트에서부터 시작됩니다.",
  BRICLOG_SLOGAN,
  "텍스트를 쌓아 브릭로그",
];

/** @deprecated 인트로 창 헤더 제거 — 하위 호환용 상수만 유지 */
export const LANDING_INTRO_EDITOR_TITLE = `브릭로그 · ${BRICLOG_SLOGAN}`;
export const LANDING_INTRO_EDITOR_TITLE_MOBILE = "브릭로그 · 오늘의 글";
export const LANDING_INTRO_BRAND_EN = "BRICLOG";
export const LANDING_INTRO_BRAND_KO = "브릭로그";
export const LANDING_INTRO_SLOGAN = BRICLOG_SLOGAN;
export const LANDING_INTRO_START_LABEL = "지금 시작하기";

/** 데스크톱 — 슬로건은 메모 3줄에서 이미 노출 */
export const LANDING_INTRO_BRAND_LINES = [
  LANDING_INTRO_BRAND_EN,
  LANDING_INTRO_BRAND_KO,
];

export const LANDING_INTRO_LINES_MOBILE = [
  "오늘도 망설이고 계신가요?",
  BRICLOG_SLOGAN,
];

export const LANDING_INTRO_BRAND_LINES_MOBILE = [
  LANDING_INTRO_BRAND_EN,
  LANDING_INTRO_BRAND_KO,
];

export const LANDING_INTRO_DISMISS_LABEL = "지금 시작하기 — 랜딩으로 이동";

/**
 * @param {{ isMobile: boolean }} viewport
 */
export function getLandingIntroCopy({ isMobile }) {
  if (!isMobile) {
    return {
      lines: LANDING_INTRO_LINES,
      brandLines: LANDING_INTRO_BRAND_LINES,
      startLabel: LANDING_INTRO_START_LABEL,
      dismissLabel: LANDING_INTRO_DISMISS_LABEL,
    };
  }
  return {
    lines: LANDING_INTRO_LINES_MOBILE,
    brandLines: LANDING_INTRO_BRAND_LINES_MOBILE,
    startLabel: LANDING_INTRO_START_LABEL,
    dismissLabel: LANDING_INTRO_DISMISS_LABEL,
  };
}
