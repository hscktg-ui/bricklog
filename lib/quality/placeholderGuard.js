/**
 * 템플릿 placeholder 탐지 — 자연스러운 한국어(「받은 내용」 등)와 구분
 */
const EN_PLACEHOLDER_RE =
  /\b(undefined|null|NaN|placeholder|TODO|FIXME|lorem)\b/i;

/** 필드 라벨·미입력 토큰만 매칭 (본문 「확인한 내용을」 등 일반 문장 제외) */
const TEMPLATE_LABEL_RE =
  /좋은내용|브랜드명|지역명|업종명|입력값(?:[:：]|을)?|(?:^|\n)내용[:：]|(?:^|\n)내용\s*입력|(?:^|\n)제목[:：]|\[브랜드\]|\[지역\]|\[키워드\]|\[내용\]|예시(?:문|글)?[:：]/im;

export function hasTemplatePlaceholder(text) {
  const t = String(text || "");
  return EN_PLACEHOLDER_RE.test(t) || TEMPLATE_LABEL_RE.test(t);
}

/** @deprecated use hasTemplatePlaceholder — RegExp 호환 export */
export const V4_PLACEHOLDER_RE = {
  test(text) {
    return hasTemplatePlaceholder(text);
  },
};
