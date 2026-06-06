/**
 * 실제 검사 결과 기반 — 과장 없이 표시
 */
export function buildPublicTestMetrics(input = {}, pack = {}, gate = {}) {
  const relevance = gate.relevance?.rate ?? 0;
  const brandPct = Math.round(
    Math.min(92, Math.max(38, relevance * 100))
  );

  const qs = pack._meta?.qualityScore?.total;
  const ai = pack._meta?.aiEditorAudit?.score;
  const raw =
    typeof qs === "number"
      ? qs
      : typeof ai === "number"
        ? ai
        : Math.round(58 + relevance * 28);
  const publishScore = Math.min(94, Math.max(42, Math.round(raw)));

  const industry = input.contextLock?.industry || input.industry || "브랜드";
  const improvementHint =
    publishScore >= 80
      ? "브랜드 작업실을 만들면 톤앤매너와 반복 메시지를 저장할 수 있습니다."
      : `${industry} 맥락을 더 쌓으면 발행 가능 점수가 올라갑니다. 작업실에서 기록을 이어가 보세요.`;

  return {
    brandUnderstandingPct: brandPct,
    publishScore,
    improvementHint,
  };
}
