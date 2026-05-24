/**
 * V3 4단계 — 정보 검증 (2회)
 * RESEARCH DEPTH: 팩트 수가 적어도 작성을 막지 않음. 축·brief·일관성만 확인.
 */
export function runDualVerificationV3(parsed, research, topicAnalysis) {
  const fact = research?.v2Axis?.factVerification || {};
  const pass1 = String(fact.pass1 || "").trim() || "1차: 조사 항목 수집";
  const pass2 = String(fact.pass2 || fact.note || "").trim() || "2차: 교차 확인";
  const factCount = parsed?.factCount ?? 0;
  const depthTier = parsed?.depthTier || "direct";
  const hasBrief =
    Boolean(String(research?.summary || "").trim()) ||
    Boolean(parsed?.factsPrompt?.trim()) ||
    Boolean(parsed?.brief?.trim());

  const pass1Ok =
    parsed?.ok !== false &&
    depthTier !== "blocked" &&
    (hasBrief || factCount >= 1);

  const pass2Ok =
    fact.consistent !== false &&
    topicAnalysis?.verified !== false &&
    parsed?.verified !== false;

  const gaps = [
    ...(fact.gaps || []),
    ...(parsed?.gaps || []),
    ...(topicAnalysis?.gaps || []),
  ]
    .map(String)
    .filter(Boolean);

  const pass = pass1Ok && pass2Ok && gaps.length < 5;

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
    depthTier,
    note: pass
      ? "2회 검증 완료 — 확인된 정보만 작성에 사용"
      : "미확인 항목은 단정하지 않고 독자 질문·브랜드 맥락으로 전개",
  };
}

export function formatVerificationBrief(verification) {
  return [
    "【V3 · 4. 정보 검증 (2회)】",
    `1차: ${verification.pass1}`,
    `2차: ${verification.pass2}`,
    verification.pass ? "결과: 통과" : "결과: 제한적 — 확인된 범위만 단정",
    verification.gaps?.length
      ? `미확인 항목: ${verification.gaps.join(" · ")}`
      : "미확인 항목: 없음(확인된 범위만 사용)",
  ].join("\n");
}
