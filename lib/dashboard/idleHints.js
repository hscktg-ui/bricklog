/**
 * 대시보드 유휴 시 상단 배너 문구 (브랜드 디렉터 톤, 위트 있되 부담 없게)
 */

export const WORKSPACE_IDLE_HINTS = [
  "맞춤 개인화: 계정 습관이 쌓이면 말투·문장 길이가 다음 글에 반영됩니다.",
  "맞춤 브랜드화: 브랜드 메모리에 톤·금지어를 저장해 두면 초안이 이어집니다.",
  "어떤 글을 써야 할지 막막하신가요? 브랜드와 주제만 적어도 초안이 정리됩니다.",
  "발행 전 검수로 어색한 표현·관용구를 줄인 뒤 복사하세요.",
];

/** @param {Date} [date] */
export function pickIdleHint(date = new Date()) {
  const idx = date.getDay() % WORKSPACE_IDLE_HINTS.length;
  return WORKSPACE_IDLE_HINTS[idx];
}

export const IDLE_HINT_DISMISS_KEY = "briclog-idle-hint-dismissed";
