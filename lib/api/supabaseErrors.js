/** Supabase/PostgREST 오류 → 사용자 안내 */

export function isMissingBrandsTable(err) {
  const code = err?.code || err?.payload?.code || err?.payload?.detail?.code;
  const msg = String(
    err?.message || err?.payload?.message || err?.payload?.detail || ""
  );
  return (
    code === "PGRST205" ||
    code === "42P01" ||
    /Could not find the table.*brands/i.test(msg) ||
    /relation.*brands.*does not exist/i.test(msg)
  );
}

export function mapSupabaseUserMessage(err, fallback = "요청에 실패했습니다.") {
  if (isMissingBrandsTable(err)) {
    return "브랜드 저장 기능을 준비 중입니다. 잠시 후 다시 시도해 주세요.";
  }
  const msg = err?.message || err?.payload?.message;
  if (msg && process.env.NODE_ENV === "development") {
    return `${fallback} (${msg})`;
  }
  return fallback;
}
