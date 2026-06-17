/**
 * 블로그 생성 CTA — 제품 전역 SSOT
 * 버튼·힌트·오류 메시지는 반드시 이 모듈에서 가져옵니다.
 */

export const BLOG_GENERATE_CTA = "조사 후 글 받기";
export const BLOG_GENERATE_CTA_BUSY = "조사·글 작성 중…";
export const BLOG_GENERATE_CTA_QUOTED = `「${BLOG_GENERATE_CTA}」`;

/**
 * @param {{ isMobile?: boolean, isTablet?: boolean }} [viewport]
 */
export function blogGenerateCtaRetryFooter(viewport = {}) {
  const { isMobile = false, isTablet = false } = viewport;
  if (isMobile) return `아래 ${BLOG_GENERATE_CTA_QUOTED}를 다시 눌러 주세요.`;
  if (isTablet) return `위 입력란의 ${BLOG_GENERATE_CTA_QUOTED}를 다시 눌러 주세요.`;
  return `왼쪽 ${BLOG_GENERATE_CTA_QUOTED}를 다시 눌러 주세요.`;
}

/**
 * @param {{ isMobile?: boolean, isTablet?: boolean }} [viewport]
 */
export function blogGenerateCtaContinueHint(viewport = {}) {
  const { isMobile = false, isTablet = false } = viewport;
  if (isMobile) return `입력 탭에서 ${BLOG_GENERATE_CTA_QUOTED}로 이어갈 수 있어요.`;
  if (isTablet) return `위 입력란의 ${BLOG_GENERATE_CTA_QUOTED}로 이어갈 수 있어요.`;
  return `왼쪽 폼에서 ${BLOG_GENERATE_CTA_QUOTED}로 이어갈 수 있어요.`;
}

/** 인라인 문장용 — normalizeGenerationError 등 */
export function blogGenerateCtaInlineRetry() {
  return `잠시 후 ${BLOG_GENERATE_CTA_QUOTED}를 다시 눌러 주세요.`;
}
