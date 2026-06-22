const EMAIL_RE =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmailFormat(email) {
  const v = String(email || "").trim().toLowerCase();
  if (!v) return { ok: false, message: "이메일을 입력해 주세요." };
  if (!EMAIL_RE.test(v)) return { ok: false, message: "이메일 형식을 확인해 주세요." };
  return { ok: true, value: v };
}
