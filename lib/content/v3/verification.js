import { V2_MIN_RESEARCH_FACTS } from "@/lib/content/v2ResearchFacts";

/**
 * V3 4단계 — 정보 검증 (2회)
 */
export function runDualVerificationV3(parsed, research, topicAnalysis) {
  const fact = research?.v2Axis?.factVerification || {};
  const pass1 = String(fact.pass1 || "").trim() || "1차: 조사 항목 수집";
  const pass2 = String(fact.pass2 || fact.note || "").trim() || "2차: 교차 확인";
  const factCount = parsed?.factCount ?? 0;

  const pass1Ok =
    factCount >= V2_MIN_RESEARCH_FACTS &&
    Boolean(research?.summary?.trim());
  const pass2Ok =
    fact.consistent !== false &&
    topicAnalysis?.verified !== false &&
    parsed?.verified !== false;

  const gaps = [
    ...(fact.gaps || []),
    ...(parsed?.gaps || []),
    ...(topicAnalysis?.gaps || []),
  ].map(String).filter(Boolean);

  const pass = pass1Ok && pass2Ok && gaps.length < 3;

  return {
    pass,
    ok: pass,
    pass1,
    pass2,
    pass1Ok,
    pass2Ok,
    consistent: fact.consistent !== false,
    gaps: [...new Set(gaps)],
    factCount,
    note: pass
      ? "2회 검증 완료 — 확인된 정보만 작성에 사용"
      : "검증 미통과 — 추측·허구 작성 금지",
  };
}

export function formatVerificationBrief(verification) {
  return [
    "【V3 · 4. 정보 검증 (2회)】",
    `1차: ${verification.pass1}`,
    `2차: ${verification.pass2}`,
    verification.pass ? "결과: 통과" : "결과: 미통과 — 출력·작성 중단",
    verification.gaps?.length
      ? `미확인 항목: ${verification.gaps.join(" · ")}`
      : "미확인 항목: 없음(확인된 범위만 사용)",
  ].join("\n");
}
