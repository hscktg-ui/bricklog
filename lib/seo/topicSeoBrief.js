import { extractTopicTokens } from "@/lib/inspiration/topicScopedInspiration";

function pickProperNouns(tokens, topic) {
  const nouns = tokens.filter(
    (t) =>
      t.length >= 2 &&
      (/[\u3131-\uD79D]/u.test(t) || /[A-Za-z]/.test(t)) &&
      !/^(하기|하는|있는)$/.test(t)
  );
  const fromTopic = String(topic || "")
    .split(/[\s,，·]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2);
  return [...new Set([...nouns, ...fromTopic])].slice(0, 12);
}

/**
 * 주제·키워드에서 추출한 고유 표현 + 키워드 인텔 → LLM용 네이버 SEO 배치 가이드
 */
export function buildTopicSeoBrief(ctx = {}) {
  const input = ctx.input || {};
  const topic = ctx.topic || ctx.contentThesis || ctx.writingSubject || input.topic || "";
  const main = ctx.main || input.mainKeyword || "";
  const sub = input.subKeyword || ctx.subKeyword || "";
  const include = ctx.includePhrases || input.includePhrases || "";
  const anchors = ctx.topicAnchor || input._topicAnchor || [];

  const tokens = extractTopicTokens(topic, main, sub, include);
  const entities = pickProperNouns(
    anchors.length ? [...anchors, ...tokens] : tokens,
    topic
  );

  const intel = ctx.keywordIntel;
  const lines = [];

  if (entities.length) {
    lines.push(
      `고유·핵심 표현(반드시 글 소재로 쓸 것): ${entities.join(", ")}`
    );
    lines.push(
      "위 표현은 제목 후보·대표 제목·도입 첫 문단·중간 소제목 1~2곳·결론 전에 각각 자연스럽게 녹일 것. 기계적 반복·나열 금지."
    );
  }

  if (main?.trim()) {
    lines.push(`메인 키워드: ${main.trim()} — 본문 전체에 4~7회, 문맥에 맞게만.`);
  }
  if (sub?.trim()) {
    lines.push(`보조 키워드: ${String(sub).trim()} — 각 1~3회, 소제목·본문에 분산.`);
  }

  if (intel?.recommendedMain) {
    lines.push(`권장 메인: ${intel.recommendedMain} · 전략: ${intel.strategy || "-"}`);
    const subs = (intel.subs || []).slice(0, 4).map((k) => k.keyword).filter(Boolean);
    if (subs.length) lines.push(`연관 후보: ${subs.join(", ")}`);
    if (intel.weaveRules) {
      lines.push(
        `배치: 메인 ${intel.weaveRules.mainMin}~${intel.weaveRules.mainMax}회, 서브 ${intel.weaveRules.subMin}~${intel.weaveRules.subMax}회, 패턴 금지: ${(intel.weaveRules.banPatterns || []).join(", ")}`
      );
    }
  }

  if (!lines.length) return "";

  lines.push(
    "맹목적 일반론·업종 상식 나열 금지. 입력한 고유명사·지명·상품명이 없으면 허구의 사례를 만들지 말 것.",
    "네이버 검색: 독자 질문에 답하는 흐름, 키워드 스터핑·'검색하시는 분' 문체 금지."
  );
  return lines.join("\n");
}
