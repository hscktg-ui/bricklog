/**
 * 고객 화면 품질·검수 표시 — 내부 벤치마크(해신 등) 노출 금지
 */

const REPLACEMENTS = [
  [/해신\s*검수\s*기준/g, "발행 품질"],
  [/해신\s*기준/g, "발행 품질"],
  [/해신기획/g, ""],
  [/해신/g, ""],
  [/golden\s*gate/gi, ""],
  [/골든\s*게이트/g, ""],
];

/** @param {string} [text] */
export function sanitizeCustomerQualityText(text) {
  if (!text || typeof text !== "string") return text;
  let out = text;
  for (const [re, rep] of REPLACEMENTS) {
    out = out.replace(re, rep);
  }
  return out
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.·])/g, "$1")
    .replace(/^[·\s]+|[·\s]+$/g, "")
    .trim();
}

/** @param {{ id?: string, label?: string, message?: string, severity?: string }} issue */
export function sanitizeCustomerAuditIssue(issue = {}) {
  const label = sanitizeCustomerQualityText(issue.label);
  const message = sanitizeCustomerQualityText(issue.message);
  return {
    ...issue,
    label: label || "표현·톤",
    message: message || issue.message || "",
  };
}

/** 내부 점수는 고객 칩·힌트에 쓰지 않음 */
export function shouldShowInternalQualityScore() {
  return false;
}

export const CUSTOMER_POLISH_READY_HINT =
  "조사·브랜드 맥락을 반영해 발행용으로 다듬었습니다. 복사 후 한 번만 읽고 올려 주세요.";
