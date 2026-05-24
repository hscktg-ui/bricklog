/**
 * 수집기 공통 — 실패 시 빈 배열, 추측·가짜 데이터 금지
 */
export function collectorResult(source, { ok, items = [], error = null, meta = {} }) {
  return {
    source,
    ok: Boolean(ok),
    items: ok ? items : [],
    error: error || null,
    fetchedAt: new Date().toISOString(),
    meta,
  };
}

export function kstDateString(date = new Date()) {
  const kst = new Date(
    date.toLocaleString("en-US", { timeZone: "Asia/Seoul" })
  );
  const y = kst.getFullYear();
  const m = String(kst.getMonth() + 1).padStart(2, "0");
  const d = String(kst.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
