/**
 * 주제 facet 추출 — informationUnit / knowledgeCoverage 공용 (순환 import 방지)
 */
import { koreanObjectParticle } from "@/lib/prompts/engine/textUtils";
import { resolveBriclogIndustryKey } from "@/lib/product/industryContextEngine.js";

const PROMO_IN_TOPIC_RE = /특별\s*할인|할인\s*행사|프로모션|이벤트|행사/gi;
const NOISE_TOKEN_RE = /^(무료|특별|할인|프로모션|행사|신규|등록|혜택|예약|선물)$/i;
const TRAILING_DROP_RE = /^(등록|혜택|예약|무료|선물|할인|행사|프로모션|패키지|코스)$/i;

export function defaultTopicFacet(input = {}) {
  const ind = String(input.industry || input.industryLabel || "").trim();
  if (/꽃|플라워|flower/i.test(ind)) return "꽃 선물";
  if (/카페|커피|브런치/i.test(ind)) return "메뉴";
  if (/미용|헤어|살롱/i.test(ind)) return "시술";
  if (/가구|침대|쇼룸/i.test(ind)) return "제품";
  if (/병원|의원|치과/i.test(ind)) return "진료";
  if (/음식|맛집|레스토랑/i.test(ind)) return "메뉴";
  return "매장 안내";
}

export function topicRaw(input = {}) {
  return String(
    input.topic || input.mainKeyword || input.writingSubject || ""
  )
    .trim()
    .split(/[,，]/)[0]
    ?.trim();
}

export function topicWritingFacet(input = {}) {
  const raw = stripVisitReviewTopicSuffix(topicRaw(input));
  if (!raw) return defaultTopicFacet(input);
  const cleaned = raw
    .replace(PROMO_IN_TOPIC_RE, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return defaultTopicFacet(input);

  let tokens = cleaned
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 1 && !NOISE_TOKEN_RE.test(w));

  while (tokens.length > 1 && TRAILING_DROP_RE.test(tokens[tokens.length - 1])) {
    tokens.pop();
  }
  if (!tokens.length) return cleaned.slice(0, 22) || defaultTopicFacet(input);
  if (tokens.length === 1) return tokens[0];

  let facet = tokens[0];
  for (let i = 1; i < Math.min(4, tokens.length); i++) {
    const next = `${facet} ${tokens[i]}`;
    if (next.replace(/\s/g, "").length > 22) break;
    facet = next;
  }
  return facet.trim() || cleaned.slice(0, 22) || defaultTopicFacet(input);
}

export function topicReaderPhrase(input = {}, slot = 0) {
  const facet = topicWritingFacet(input);
  const raw = topicRaw(input);

  if (!facet || facet === "이용") {
    const fallback = [
      defaultTopicFacet(input),
      "방문·예약",
      "상담 안내",
      "문의 안내",
      "매장 안내",
    ];
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

const EXPLICIT_REVIEW_TOPIC_RE =
  /후기|체험|다녀|방문해\s*보|솔직\s*후기|다녀온|써봤|느꼈/;

const VISIT_TOPIC_SUFFIX_RE =
  /\s*(?:다녀(?:왔|온|갔)어요|다녀(?:왔|온|갔)음|방문\s*후기|솔직\s*후기|체험\s*후기|후기)\s*$/i;

export function stripVisitReviewTopicSuffix(text = "") {
  return String(text || "")
    .replace(VISIT_TOPIC_SUFFIX_RE, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** 방문·체험 후기 주제 — 정보형·제품 가이드 라우팅 제외 */
export function isVisitReviewTopicInput(input = {}) {
  const blob = [
    input.topic,
    input.includePhrases,
    input.mainKeyword,
    input.purposeType,
    input.purpose,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const rawTopic = topicRaw(input).toLowerCase();
  if (EXPLICIT_REVIEW_TOPIC_RE.test(blob) || EXPLICIT_REVIEW_TOPIC_RE.test(rawTopic)) {
    return true;
  }
  if (/방문\s*후기|직접\s*다녀/.test(blob)) return true;
  return false;
}

const INFORMATIONAL_TOPIC_RE =
  /소개|사야\s*할|고르는\s*법|종류|계절|여름|가을|봄|겨울|시즌|리스트|정보|알려|가이드|설명|정리|선택\s*기준|무엇을\s*살|뭐\s*살|어떤\s*꽃/;

/** 로컬 매장(꽃집·카페 등) — 브로슈어 정보형 대신 방문·현장 톤 우선 */
export function prefersVisitExperienceTone(input = {}) {
  const key = resolveBriclogIndustryKey(input);
  if (["flower", "cafe", "restaurant", "salon", "beauty", "pet_cafe"].includes(key)) {
    return true;
  }
  const blob = `${input.industry || ""} ${input.brandName || ""}`;
  return /꽃집|플라워|카페|미용실|음식점|베이커리/i.test(blob);
}

/** 정보형·가이드 주제 — 방문 후기 톤 라우팅 제외용 */
export function isInformationalTopicInput(input = {}) {
  if (isVisitReviewTopicInput(input)) return false;

  if (prefersVisitExperienceTone(input)) {
    const raw = topicRaw(input).toLowerCase();
    if (/고르는\s*법|선택\s*기준|종류\s*정리|가이드|업체\s*소개/.test(raw)) {
      return true;
    }
    if (input.purposeType === "info" || input.purpose === "info") {
      return /소개|가이드|정리|알려|선택\s*기준/.test(raw);
    }
    return false;
  }

  const blob = [
    input.topic,
    input.includePhrases,
    input.mainKeyword,
    input.purposeType,
    input.purpose,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const rawTopic = topicRaw(input).toLowerCase();

  if (input.purposeType === "info" || input.purpose === "info") return true;
  if (INFORMATIONAL_TOPIC_RE.test(rawTopic) || /업체\s*소개/.test(rawTopic)) return true;

  const infoDominant =
    /(?:소개|가이드|정리|알려|고르는\s*법|업체|선택\s*기준)/.test(blob) ||
    INFORMATIONAL_TOPIC_RE.test(blob);
  const visitReviewDominant =
    /(?:솔직\s*후기|방문\s*후기|다녀온\s*후기|직접\s*다녀)/.test(blob);
  if (infoDominant && !visitReviewDominant) return true;

  if (EXPLICIT_REVIEW_TOPIC_RE.test(blob)) return false;
  return INFORMATIONAL_TOPIC_RE.test(blob);
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
