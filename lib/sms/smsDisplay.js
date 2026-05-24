/** 가입 화면에 표시할 발신번호 (공개 정보) */

const DEFAULT_SENDER_DIGITS = "07088447209";
const DEFAULT_SENDER_DISPLAY = "070-8844-7209";

export function formatSmsSenderDisplay(raw) {
  const trimmed = String(raw || "").trim();
  if (trimmed.includes("-")) {
    const d = trimmed.replace(/\D/g, "");
    if (d.length >= 9) return trimmed;
  }

  const d = String(raw || DEFAULT_SENDER_DIGITS).replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("010")) {
    return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  }
  if (d.length === 11 && d.startsWith("070")) {
    return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  }
  if (d.length === 10 && d.startsWith("02")) {
    return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}`;
  }
  if (d.length >= 8) {
    return d;
  }
  return DEFAULT_SENDER_DISPLAY;
}

export function getPublicSmsSenderLabel() {
  const fromEnv = process.env.NEXT_PUBLIC_SMS_SENDER_DISPLAY?.trim();
  if (fromEnv) {
    return fromEnv.includes("-") ? fromEnv : formatSmsSenderDisplay(fromEnv);
  }
  return formatSmsSenderDisplay(DEFAULT_SENDER_DIGITS);
}

/** @param {string} [serverPhone] — API에서 내려준 발신번호 */
export function resolveSmsSenderLabel(serverPhone) {
  if (serverPhone) return formatSmsSenderDisplay(serverPhone);
  return getPublicSmsSenderLabel();
}

/** Solapi `from` 필드용 숫자만 */
export function normalizeSmsSenderForApi(raw) {
  const d = String(raw || DEFAULT_SENDER_DIGITS).replace(/\D/g, "");
  return d || DEFAULT_SENDER_DIGITS;
}
