/** 생성 대기 시간 안내용 — 실제 API 시간은 변동 큼 */

export function estimateBlogGenerationMs(
  input,
  { blogOnly = true, withDefaultResearch = false } = {}
) {
  let ms = blogOnly ? 75_000 : 140_000;
  const hasResearch =
    input?.researchEnabled ||
    withDefaultResearch ||
    Boolean(
      String(input?.brandName || "").trim() &&
        (String(input?.topic || "").trim() || String(input?.mainKeyword || "").trim())
    );
  if (hasResearch) ms += 95_000;
  if (input?.desiredLength === "long" || input?.blogLengthTier === "long") {
    ms += 25_000;
  }
  return ms;
}

export function formatDurationKo(ms) {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m > 0 && s > 0) return `${m}분 ${s}초`;
  if (m > 0) return `${m}분`;
  return `${s}초`;
}
