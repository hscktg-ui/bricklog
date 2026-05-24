/**
 * 민감 업종 전용 프롬프트 보강
 */

/** @param {ReturnType<typeof import('./sensitiveCategories.js').resolveSensitiveCompliance>} compliance */
export function buildSensitiveSystemAddon(compliance) {
  if (!compliance?.isSensitive) return "";

  const laws = (compliance.lawReminders || [])
    .map((l) => `- ${l}`)
    .join("\n");

  return `

SENSITIVE INDUSTRY COMPLIANCE (Korea — conservative, not legal advice):
- Categories: ${compliance.label || compliance.types?.join(", ")}
- NEVER: cure promises, guaranteed returns/yields, unauthorized legal advice, specific prescription drug names as recommendations, guaranteed lawsuit outcomes, definite property price appreciation, "무조건", "100%", "완치", "부작용 없음".
- USE: "확인 필요", "개인·상황에 따라 다름", "전문가(의료진·약사·변호사·공인중개사·세무사) 상담 권장".
- Do not cite specific law article numbers unless user provided them — do not invent statutes.
- Factual claims about services, prices, hours, licenses: soften to "문의·확인" unless in user input.
Static guardrails (not real-time law DB):
${laws}
${compliance.disclaimer ? `- Disclaimer tone: ${compliance.disclaimer}` : ""}`;
}

export function buildSensitiveUserAddon(compliance, regenNote = null) {
  if (!compliance?.isSensitive) return "";

  let block = `

【민감 업종 작성 규칙】 (${compliance.label})
- 의료·약국: 특정 약품명·처방·완치·치료 보장·비교 우월 표현 금지. "의료진·약사와 상담" 안내.
- 법률: 사건 결과·승소·형량·법률 자문 단정 금지. "법률 전문가 상담" 안내.
- 부동산: 가격·수익·매칭·계약 조건 단정 금지. "현장·등기·공식 매물 확인" 안내.
- 금융·세무: 수익·절세·환급 보장 금지. "개인별 상이·전문가·공식 확인" 안내.
- 불확실한 사실은 "확인 필요" 또는 "문의 시 안내"로 표기.
- 과장·최상급·1위·무조건 표현 금지.`;

  if (regenNote) {
    block += `\n【재작성】 이전 초안 검수: ${regenNote}`;
  }

  return block;
}
