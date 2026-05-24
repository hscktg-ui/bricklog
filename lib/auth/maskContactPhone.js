/** 클라이언트·화면 노출용 연락처 마스킹 */
export function maskContactPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length < 8) return null;
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-****-${digits.slice(7)}`;
  }
  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}
