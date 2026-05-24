/**
 * V3 3단계 — 주제·제품 분석 (조사 결과 기반)
 */
export function analyzeTopicV3(input = {}, parsed = {}, research = null) {
  const topic = String(input.topic || input.mainKeyword || "").trim();
  const v2 = research?.v2Axis?.topicAnalysis || {};
  const productName =
    String(parsed?.productName || v2.productName || "").trim() || topic;

  const exists =
    v2.verified !== false &&
    parsed?.verified !== false &&
    Boolean(productName);

  return {
    topic,
    productName,
    exists,
    features: v2.features || [],
    specs: v2.specs || [],
    differentiators: v2.differentiators || [],
    verified: exists,
    gaps: parsed?.gaps || research?.v2Axis?.gaps || [],
  };
}

export function formatTopicAnalysisBrief(analysis) {
  if (!analysis?.topic) return "";
  return [
    "【V3 · 3. 주제·제품 분석】",
    `주제: ${analysis.topic}`,
    `제품명: ${analysis.productName}`,
    `존재·확인: ${analysis.exists ? "조사로 확인됨" : "미확인 — 추측·허구 금지"}`,
    analysis.features?.length
      ? `특징: ${analysis.features.join(" · ")}`
      : null,
    analysis.differentiators?.length
      ? `차별점: ${analysis.differentiators.join(" · ")}`
      : null,
    analysis.specs?.length ? `스펙: ${analysis.specs.join(" · ")}` : null,
    analysis.gaps?.length
      ? `미확인: ${analysis.gaps.join(" · ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}
