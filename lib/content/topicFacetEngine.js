/**
 * 주제 facet 추출 — informationUnit / knowledgeCoverage 공용 (순환 import 방지)
 */
import { koreanObjectParticle } from "@/lib/prompts/engine/textUtils";

const PROMO_IN_TOPIC_RE = /특별\s*할인|할인\s*행사|프로모션|이벤트|행사/gi;
const NOISE_TOKEN_RE = /^(무료|특별|할인|프로모션|행사|신규|등록|혜택|예약|선물)$/i;
const TRAILING_DROP_RE = /^(등록|혜택|예약|무료|선물|할인|행사|프로모션|패키지|코스)$/i;

export function topicRaw(input = {}) {
  return String(
    input.topic || input.mainKeyword || input.writingSubject || ""
  )
    .trim()
    .split(/[,，]/)[0]
    ?.trim();
}

export function topicWritingFacet(input = {}) {
  const raw = topicRaw(input);
  if (!raw) return "이용";
  const cleaned = raw
    .replace(PROMO_IN_TOPIC_RE, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "이용";

  let tokens = cleaned
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 1 && !NOISE_TOKEN_RE.test(w));

  while (tokens.length > 1 && TRAILING_DROP_RE.test(tokens[tokens.length - 1])) {
    tokens.pop();
  }
  if (!tokens.length) return cleaned.slice(0, 22) || "이용";
  if (tokens.length === 1) return tokens[0];

  let facet = tokens[0];
  for (let i = 1; i < Math.min(4, tokens.length); i++) {
    const next = `${facet} ${tokens[i]}`;
    if (next.replace(/\s/g, "").length > 22) break;
    facet = next;
  }
  return facet.trim() || cleaned.slice(0, 22) || "이용";
}

export function topicReaderPhrase(input = {}, slot = 0) {
  const facet = topicWritingFacet(input);
  const raw = topicRaw(input);

  if (!facet || facet === "이용") {
    const fallback = ["매장 안내", "이용 안내", "방문·예약", "상담 안내", "문의 안내"];
    return fallback[slot % fallback.length];
  }

  const tokens = facet.split(/\s+/).filter(Boolean);
  const shortFacet =
    tokens.length > 1 ? tokens.slice(-Math.min(2, tokens.length)).join(" ") : facet;

  const phrases = [
    shortFacet !== facet && !raw.includes(shortFacet) ? shortFacet : `${facet} 안내`,
    shortFacet !== facet ? shortFacet : `${facet} 체험`,
    "매장 안내",
    `${shortFacet} 문의`,
    "이번 안내",
  ].filter((p, i, arr) => p && arr.indexOf(p) === i);

  for (let i = 0; i < phrases.length; i++) {
    const pick = phrases[(slot + i) % phrases.length];
    if (pick && pick !== raw && !pick.includes(raw)) return pick;
  }

  const brand = String(input.brandName || "매장").trim();
  return `${brand} 안내`;
}

export function deriveTopicWritingContext(input = {}) {
  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  const raw = topicRaw(input);
  const facet = topicWritingFacet(input);
  return {
    brand,
    region,
    topic: facet,
    topicRaw: raw,
    topicFacet: facet,
    regionBit: region ? `${region} ` : "",
    topicObj: koreanObjectParticle(facet),
    readerPhrase: topicReaderPhrase(input, 0),
    avoidVerbatim: raw,
  };
}
