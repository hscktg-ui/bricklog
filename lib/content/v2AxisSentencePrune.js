import { findBannedTemplateHits } from "@/lib/content/v2BannedTemplates";
import { factTextsFromList } from "@/lib/content/v2ResearchFacts";

const GENERIC_FILLER_RE = [
  /많은\s*분들이/,
  /요즘\s*트렌드/,
  /일반적으로\s*말/,
  /알아두면\s*좋은/,
  /소중한\s*순간/,
  /특별한\s*경험/,
  /행복한\s*시간/,
  /따뜻한\s*공간/,
  /가치를\s*전달/,
  /감동을\s*선사/,
];

export function splitKoreanSentences(text) {
  return String(text || "")
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.replace(/\s/g, "").length >= 6);
}

function axisTokens(ctx) {
  const brand = String(ctx.brandName || "").trim();
  const region = String(ctx.region || "").trim();
  const topic = String(ctx.topic || ctx.writingSubject || "").trim();
  const product = String(ctx.v2ProductName || "").trim();
  const productShort =
    product.match(/([A-Za-z0-9가-힣]{2,20})/)?.[1] || product.split(/\s+/)[0];
  return [brand, region, topic, productShort]
    .filter((t) => t && t.length >= 2)
    .filter((t, i, arr) => arr.indexOf(t) === i);
}

function sentenceMatchesFact(sentence, factTexts) {
  for (const f of factTexts) {
    const fact = String(f).trim();
    if (fact.length < 4) continue;
    if (sentence.includes(fact)) return true;
    const anchor = fact.length > 16 ? fact.slice(0, 10) : fact;
    if (anchor.length >= 4 && sentence.includes(anchor)) return true;
  }
  return false;
}

/**
 * 브랜드·지역·주제·조사 팩트와 무관한 문장 여부
 */
export function isSentenceOnAxis(sentence, ctx, factTexts = []) {
  const s = String(sentence || "").trim();
  if (s.replace(/\s/g, "").length < 10) return true;
  if (findBannedTemplateHits(s).length) return false;
  if (GENERIC_FILLER_RE.some((re) => re.test(s))) {
    const tokens = axisTokens(ctx);
    if (!tokens.some((t) => s.includes(t))) return false;
  }
  const tokens = axisTokens(ctx);
  if (tokens.some((t) => s.includes(t))) return true;
  if (sentenceMatchesFact(s, factTexts)) return true;
  if (s.length >= 28 && !tokens.some((t) => s.includes(t))) return false;
  return true;
}

export function scoreResearchGrounding(fullText, ctx, researchFacts = []) {
  const factTexts = factTextsFromList(researchFacts);
  const sentences = splitKoreanSentences(fullText).filter(
    (s) => s.replace(/\s/g, "").length >= 12
  );
  if (!sentences.length) {
    return { ratio: 1, grounded: 0, total: 0 };
  }
  let grounded = 0;
  for (const s of sentences) {
    if (isSentenceOnAxis(s, ctx, factTexts)) grounded += 1;
  }
  return {
    ratio: grounded / sentences.length,
    grounded,
    total: sentences.length,
  };
}

/**
 * 무관 문장 삭제 후 pack 반환
 */
export function pruneOffAxisSentences(pack, ctx, researchFacts = []) {
  if (!pack?.sections?.length) {
    return { pack, removedCount: 0, removedSamples: [] };
  }
  const factTexts = factTextsFromList(researchFacts);
  let removedCount = 0;
  const removedSamples = [];

  const sections = pack.sections.map((sec) => {
    const body = String(sec.body || "");
    const sentences = splitKoreanSentences(body);
    if (!sentences.length) return sec;
    const kept = [];
    for (const s of sentences) {
      if (isSentenceOnAxis(s, ctx, factTexts)) kept.push(s);
      else {
        removedCount += 1;
        if (removedSamples.length < 5) removedSamples.push(s.slice(0, 80));
      }
    }
    return { ...sec, body: kept.join("\n\n") };
  });

  let conclusion = pack.conclusion;
  if (conclusion) {
    const kept = [];
    for (const s of splitKoreanSentences(conclusion)) {
      if (isSentenceOnAxis(s, ctx, factTexts)) kept.push(s);
      else {
        removedCount += 1;
        if (removedSamples.length < 5) removedSamples.push(s.slice(0, 80));
      }
    }
    conclusion = kept.join(" ");
  }

  return {
    pack: { ...pack, sections, conclusion },
    removedCount,
    removedSamples,
  };
}
