/**
 * 고객-facing 카피 포맷 — 중간점 · 양쪽 공백
 */
export function dotJoin(...parts) {
  return parts.filter(Boolean).join(" · ");
}
