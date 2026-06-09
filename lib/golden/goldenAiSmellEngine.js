/**
 * Golden Dataset — AI 냄새·관용구 검사 (해신기획 Seed 연동)
 */
import {
  AI_CLICHE_PHRASES,
  FORBIDDEN_GLOBAL_PHRASES,
} from "@/lib/golden/haeshinContentDnaSeed";

export const GOLDEN_AI_SMELL_PHRASES = [
  { id: "neutral_summary", re: /중립적으로\s*정리/ },
  { id: "related_bomyeon", re: /관련해서\s*보면|관련해서\s*를/ },
  { id: "filler_utilize", re: /(?<![가-힣])이용(?=\s*(?:을|를|은|는|이|가|과|와|·|—|관련|볼|기준|선택|안내|$))/ },
  { id: "good_content", re: /좋은\s*내용|좋은내용/ },
  { id: "condition_compose", re: /조건(?:\s*및\s*|\s*·\s*)구성/ },
  { id: "compare_easy", re: /비교(?:가|는)\s*수월(?:해|합)/ },
  { id: "checked_review", re: /확인(?:해\s*)?봤(?:어)?요/ },
  { id: "service_provide", re: /서비스를\s*제공합니다/ },
  { id: "placeholder_brand", re: /브랜드명|지역명|업종명/ },
];

/**
 * @param {string} full
 */
export function scoreGoldenAiSmell(full = "") {
  const text = String(full || "");
  const hits = [];
  let penalty = 0;

  for (const { id, re } of GOLDEN_AI_SMELL_PHRASES) {
    const m = text.match(new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`));
    const count = m ? m.length : 0;
    if (count) {
      hits.push({ id, count });
      penalty += Math.min(18, count * 6);
    }
  }

  for (const phrase of [...FORBIDDEN_GLOBAL_PHRASES, ...AI_CLICHE_PHRASES]) {
    if (phrase.length < 3) continue;
    if (text.includes(phrase)) {
      hits.push({ id: `seed:${phrase}`, count: 1 });
      penalty += 8;
    }
  }

  const score = Math.max(0, 100 - penalty);
  return {
    score,
    ok: score >= 85,
    hits,
    totalHits: hits.reduce((s, h) => s + h.count, 0),
  };
}
