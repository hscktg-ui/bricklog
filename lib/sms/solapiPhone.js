/** Solapi 국내 SMS — 수신번호는 010… 숫자만 (country=82 별도) */
export function formatSolapiDomesticPhone(raw) {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.startsWith("82") && d.length >= 10) {
    d = `0${d.slice(2)}`;
  }
  if (d.startsWith("10") && d.length >= 10) {
    d = `0${d}`;
  }
  return d;
}

export function isValidSolapiMobile(digits) {
  return /^01[016789]\d{7,8}$/.test(digits);
}
