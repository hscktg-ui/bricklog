/**
 * Admin 운영 조언 — 오류·실패 사유별 실행 힌트
 */

const ERROR_HINTS = {
  "e.test is not a function": {
    summary: "RegExp 대신 문자열에 .test() 호출 — safeRegex 패치(54eca7d3) 적용됨",
    action:
      "패치 배포 후 블로그·채널 재생성으로 신규 오류 확인. 오늘 로그가 전부 동일하면 패치 전 사고일 수 있음.",
    staleIfUniform: true,
  },
};

const FAIL_REASON_HINTS = {
  human_belief_low:
    "조사+화자 경로(a9761995) 확인. 방문 후기는 담백한 후기형·자료조사 권장.",
  grounded_specificity_low:
    "자료조사 팩트 2건 이상·주제·지역 구체화. 채널은 조사 기반 폴백(c1506d74) 반영 여부 확인.",
  visit_review_template_contamination:
    "방문 후기 게이트(3cac49cb) — 정보형 템플릿 오염. pet_cafe·visit 주제로 회귀 테스트.",
  outline_only_output: "LLM 초안 실패 — 폴백·채널 derive 로그 확인.",
  research_depth: "자료조사 유형·연구 주제 보강 후 재시도.",
  v2axis_low_research_grounding: "조사 결과 검증 단계 — 팩트 수·축 부족.",
  not_publishable: "본문 미달 — editorPreOutputGate·humanWritingDeliveryGate 로그.",
  checklist_template_high: "체크리스트형 문장 — mission 폴백 대신 research pack 우선 확인.",
};

/**
 * @param {string} message
 */
export function hintForErrorMessage(message = "") {
  const key = String(message || "").trim();
  return ERROR_HINTS[key] || null;
}

/**
 * @param {string} reason
 */
export function hintForFailReason(reason = "") {
  const key = String(reason || "").trim();
  if (FAIL_REASON_HINTS[key]) {
    return { summary: FAIL_REASON_HINTS[key] };
  }
  return null;
}

/**
 * 동일 메시지가 오늘 오류 전부이면 패치 전 로그 가능성
 */
export function isLikelyStaleUniformErrors(errors = [], message = "") {
  if (!errors.length || !message) return false;
  const hint = hintForErrorMessage(message);
  if (!hint?.staleIfUniform) return false;
  return errors.every((e) => e.message === message);
}
