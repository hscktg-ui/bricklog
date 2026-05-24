/** 생성 대기 시간 안내용 — 실제 API 시간은 변동 큼 */

export function estimateBlogGenerationMs(input, { blogOnly = true } = {}) {
  let ms = blogOnly ? 55_000 : 120_000;
  if (input?.researchEnabled) ms += 60_000;
  if (input?.desiredLength === "long") ms += 20_000;
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
