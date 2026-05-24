/**
 * 로컬 개발용 인메모리 OTP (BRICLOG_SMS_DEV_MODE=true, DB/서비스롤 없을 때만)
 * @typedef {{ id: string, phone_normalized: string, code_hash: string, expires_at: string, verified_at: string | null, verify_attempts: number, consumed_at: string | null, created_at: string }} DevOtpRow
 */

/** @type {Map<string, DevOtpRow[]>} */
const byPhone = new Map();

export function devOtpEnabled() {
  return process.env.BRICLOG_SMS_DEV_MODE === "true";
}

function rowsFor(phone) {
  let list = byPhone.get(phone);
  if (!list) {
    list = [];
    byPhone.set(phone, list);
  }
  return list;
}

export function devOtpInsert({ phone_normalized, code_hash, expires_at }) {
  const id = `dev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const row = {
    id,
    phone_normalized,
    code_hash,
    expires_at,
    verified_at: null,
    verify_attempts: 0,
    consumed_at: null,
    created_at: new Date().toISOString(),
  };
  const list = rowsFor(phone_normalized);
  list.unshift(row);
  if (list.length > 10) list.length = 10;
  return row;
}

export function devOtpCountRecent(phone_normalized, sinceMs) {
  const since = Date.now() - sinceMs;
  return rowsFor(phone_normalized).filter(
    (r) => new Date(r.created_at).getTime() >= since
  ).length;
}

export function devOtpLatestActive(phone_normalized) {
  const list = rowsFor(phone_normalized);
  return (
    list.find((r) => !r.consumed_at && new Date(r.expires_at).getTime() > Date.now()) ||
    null
  );
}

export function devOtpUpdate(id, patch) {
  for (const list of byPhone.values()) {
    const row = list.find((r) => r.id === id);
    if (row) {
      Object.assign(row, patch);
      return row;
    }
  }
  return null;
}

export function devOtpGetById(id) {
  for (const list of byPhone.values()) {
    const row = list.find((r) => r.id === id);
    if (row) return row;
  }
  return null;
}
