/** @returns {{ ok: true, e164: string, display: string } | { ok: false, message: string }} */
export function normalizeKoreanMobile(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  let d = digits;
  if (d.startsWith("82") && d.length >= 10) {
    d = `0${d.slice(2)}`;
  }
  if (!/^01[016789]\d{7,8}$/.test(d)) {
    return {
      ok: false,
      message: "휴대폰 번호 형식을 확인해 주세요. (예: 010-1234-5678)",
    };
  }
  const display =
    d.length === 11
      ? `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`
      : `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return { ok: true, e164: d, display };
}
