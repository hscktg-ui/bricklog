/** TOPIC COVERAGE ENGINE — 주제 설명 6질문 */

export const TOPIC_COVERAGE_QUESTIONS = [
  { id: "what", label: "무엇인가", patterns: [/무엇|정의|이란|소개|종류/] },
  { id: "why_search", label: "왜 찾는가", patterns: [/왜|이유|필요|고민|찾/] },
  { id: "features", label: "어떤 특징", patterns: [/특징|구성|성분|스펙|메뉴/] },
  { id: "difference", label: "무엇이 다른가", patterns: [/차이|다른|비교|대비/] },
  { id: "audience", label: "누가 관심", patterns: [/대상|누구|고객|추천|반려/] },
  { id: "check", label: "무엇을 확인", patterns: [/확인|주의|문의|선택|기준/] },
];

export function assessTopicCoverageFromText(text = "") {
  const full = String(text || "").trim();
  if (!full) {
    return {
      ok: false,
      covered: [],
      count: 0,
      total: TOPIC_COVERAGE_QUESTIONS.length,
      explanationRate: 0,
    };
  }

  const covered = [];
  for (const q of TOPIC_COVERAGE_QUESTIONS) {
    if (q.patterns.some((re) => re.test(full))) covered.push(q.id);
  }

  const total = TOPIC_COVERAGE_QUESTIONS.length;
  const count = covered.length;
  return {
    ok: count >= 4,
    covered,
    count,
    total,
    explanationRate: count / total,
    questions: TOPIC_COVERAGE_QUESTIONS.map((q) => ({
      ...q,
      covered: covered.includes(q.id),
    })),
  };
}

export function assessTopicCoverage(pack, input = {}) {
  const full = [
    ...(pack?.sections || []).map((s) => `${s.heading || ""}\n${s.body || ""}`),
    pack?.conclusion,
  ]
    .filter(Boolean)
    .join("\n");

  const covered = [];
  for (const q of TOPIC_COVERAGE_QUESTIONS) {
    if (q.patterns.some((re) => re.test(full))) covered.push(q.id);
  }

  const result = assessTopicCoverageFromText(full);
  return {
    ...result,
    questions: result.questions || TOPIC_COVERAGE_QUESTIONS.map((q) => ({
      ...q,
      covered: (result.covered || []).includes(q.id),
    })),
  };
}
