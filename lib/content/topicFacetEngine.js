/**
 * 주제 facet 추출 — informationUnit / knowledgeCoverage 공용 (순환 import 방지)
 */
import { koreanObjectParticle } from "@/lib/prompts/engine/textUtils";
import {
  isExhibitionTopic,
  resolveBriclogIndustryKey,
} from "@/lib/product/industryContextEngine.js";

const PROMO_IN_TOPIC_RE = /특별\s*할인|할인\s*행사|프로모션|이벤트|행사/gi;
const NOISE_TOKEN_RE = /^(무료|특별|할인|프로모션|행사|신규|등록|혜택|예약|선물)$/i;
const TRAILING_DROP_RE = /^(등록|혜택|예약|무료|선물|할인|행사|프로모션|패키지|코스)$/i;

export function defaultTopicFacet(input = {}) {
  const blob = `${input.topic || ""} ${input.mainKeyword || ""} ${topicRaw(input)}`;
  if (/수영|물놀이|워터파크|풀장/.test(blob)) return "수영장";
  if (/개장|그랜드\s*오픈|리뉴얼/.test(blob)) {
    const m = blob.match(/([가-힣a-zA-Z0-9\s]{2,16})\s*(?:개장|오픈)/);
    if (m?.[1]) return m[1].trim().slice(0, 16);
  }
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
  const full = String(
    input.topic || input.mainKeyword || input.writingSubject || ""
  ).trim();
  if (!full) return "";

  const parts = full.split(/[,，]/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 1) return parts[0];

  const region = String(input.region || "")
    .trim()
    .replace(/\s+/g, "");
  const head = parts[0].replace(/\s+/g, "");

  if (
    parts.length >= 2 &&
    region &&
    (head === region || region.includes(head) || head.includes(region) || head.length <= 4)
  ) {
    const tail = parts.slice(1).join(" ").trim();
    if (tail.replace(/\s/g, "").length >= 2) return tail;
  }

  const substantive = parts
    .slice()
    .sort((a, b) => b.replace(/\s/g, "").length - a.replace(/\s/g, "").length)[0];
  return substantive || parts[0];
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
  /후기|체험\s*후기|다녀|방문해\s*보|솔직\s*후기|다녀온|써봤|느꼈|직접\s*체험해/;

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
  if (
    /솔직|후기|다녀|직접\s*둘러|방문/.test(blob) &&
    /오픈|수영|체험|목장|승마|워터|풀장/.test(blob)
  ) {
    return true;
  }
  return false;
}

const INFORMATIONAL_TOPIC_RE =
  /소개|사야\s*할|고르는\s*법|종류|계절|여름|가을|봄|겨울|시즌|리스트|정보|알려|가이드|설명|정리|선택\s*기준|무엇을\s*살|뭐\s*살|어떤\s*꽃/;

/** 제품코드·스펙·쇼룸·시술·꽃명·메뉴 — 조사·정보형 우선 */
const RESEARCH_HEAVY_MODEL_RE =
  /\b[A-Z]{2,}(?:[\s-][A-Z0-9]{2,}){1,}\b|STRESSLESS|스트레스리스|TEMPUR|템퍼|프로애드|PROAID|오피모|OPIMO|다이닝\s*체어|제로지|리클라이닝|모션\s*베드|좌판|등받이|쇼룸\s*비교|모델\s*비교|라인업|시리즈\s*비교|Galaxy|갤럭시|iPhone|아이폰|SM-[A-Z0-9]+|슈링크|리쥬란|보톡스|임플란트|CEREC|라미네이트|지르코니아|시그니처\s*메뉴|핸드드립|원두\s*블렌드/i;
const RESEARCH_HEAVY_INDUSTRY_RE =
  /가구|침대|매트리스|furniture|bed|mattress|쇼룸|꽃|플라워|flower|미용|헤어|살롱|치과|병원|의원|clinic|카페|cafe|커피|음식|레스토랑|전자|스마트폰|pet|간식|snack/i;

/** 브랜드 라인·모델 접미 — 스트레스리스 키워드 없이도 스펙형 주제 감지 */
const PRODUCT_LINE_TOKEN_RE =
  /루체\s*[\d-]*|오피모\s*[\d-]*|프로애드|시몬스|일룸|허먼\s*밀러|한샘|칼튼|에보니아|씰리|슬립넘버|레그노|퀸슬립|로얄에이스|카라반|노르딕|노르딕\s*슬립|리바트|까사미아|한샘\s*침대/i;
const MODEL_CODE_SUFFIX_RE = /\bD\d{2,4}\b|\b[A-Z]{1,3}\d{2,4}\b/;
const SPEC_DENSITY_CONTEXT_RE =
  /비교|선택|스펙|모델|체어|침대|쇼룸|제로지|리클라이닝|좌판|등받이|시술|임플란트|교정|꽃|메뉴|원두|시그니처|추천|종류|급여|성분|라인업|시리즈|전시|소개|구성|체험|안내/;

function countSpecDensitySignals(blob = "") {
  const text = String(blob || "");
  let n = 0;
  if (RESEARCH_HEAVY_MODEL_RE.test(text)) n += 2;
  if (MODEL_CODE_SUFFIX_RE.test(text)) n += 1;
  if (PRODUCT_LINE_TOKEN_RE.test(text)) n += 1;
  if (/\b[A-Z]{2,}(?:\s+[A-Z0-9]{2,}){1,3}\b/.test(text)) n += 1;
  if (SPEC_DENSITY_CONTEXT_RE.test(text)) n += 1;
  return n;
}

/** 공개 정보가 얇고 제품·스펙 신호가 많은 주제 — 키워드 하드코딩 없이 정보량 형태로 분류 */
export function isSpecDenseLowPublicInfoTopic(input = {}) {
  const raw = topicRaw(input);
  const blob = [
    raw,
    input.mainKeyword,
    input.topic,
    input.includePhrases,
    input.storeFeatures,
    input.industry,
    input.brandName,
  ]
    .filter(Boolean)
    .join(" ");
  if (!RESEARCH_HEAVY_INDUSTRY_RE.test(blob)) return false;

  const signals = countSpecDensitySignals(blob);
  const topicTokens = raw.split(/\s+/).filter(Boolean);
  const narrativeThin =
    topicTokens.length <= 8 &&
    !EXPLICIT_REVIEW_TOPIC_RE.test(blob) &&
    !/솔직\s*후기|다녀온|체험\s*후기/.test(blob);

  if (signals >= 3 && narrativeThin) return true;
  if (
    (MODEL_CODE_SUFFIX_RE.test(blob) || PRODUCT_LINE_TOKEN_RE.test(blob)) &&
    SPEC_DENSITY_CONTEXT_RE.test(blob)
  ) {
    return true;
  }
  if (signals >= 2 && /쇼룸|전시|프랜차이즈|매장/.test(blob) && narrativeThin) {
    return true;
  }
  return false;
}

export function isResearchHeavyTopicInput(input = {}) {
  const raw = topicRaw(input);
  const blob = [
    raw,
    input.mainKeyword,
    input.topic,
    input.includePhrases,
    input.storeFeatures,
    input.industry,
  ]
    .filter(Boolean)
    .join(" ");
  if (RESEARCH_HEAVY_MODEL_RE.test(blob)) return true;
  if (isSpecDenseLowPublicInfoTopic(input)) return true;
  if (
    (input.purposeType === "info" || input.purpose === "info") &&
    RESEARCH_HEAVY_INDUSTRY_RE.test(blob) &&
    !prefersVisitExperienceTone(input)
  ) {
    return true;
  }
  return false;
}

const LOCAL_SERVICE_INDUSTRY_KEYS = new Set([
  "flower",
  "cafe",
  "restaurant",
  "salon",
  "beauty",
  "pet_cafe",
  "education",
  "craft",
  "pension",
  "construction",
  "marketing",
  "tea_cafe",
]);

const LOCAL_SERVICE_PROMO_TOPIC_RE =
  /특강|모집|할인|이벤트|오픈|클래스|리뉴얼|프로모|장박|상담|체험|원데이|워크숍|수업|등록|패키지/;

/** 학원·공방·펜션 등 — 시즌·이벤트 주제도 방문·상담형 (제품 가이드형 제외) */
export function isLocalServicePromoTopic(input = {}) {
  const key = resolveBriclogIndustryKey(input);
  if (!LOCAL_SERVICE_INDUSTRY_KEYS.has(key)) return false;
  const raw = topicRaw(input).toLowerCase();
  return LOCAL_SERVICE_PROMO_TOPIC_RE.test(raw);
}

/** 로컬 매장(꽃집·카페·학원·공방 등) — 브로슈어 정보형 대신 방문·현장 톤 우선 */
export function prefersVisitExperienceTone(input = {}) {
  const key = resolveBriclogIndustryKey(input);
  if (LOCAL_SERVICE_INDUSTRY_KEYS.has(key)) {
    return true;
  }
  const blob = `${input.industry || ""} ${input.brandName || ""}`;
  return /꽃집|플라워|카페|미용실|음식점|베이커리|학원|공방|펜션|인테리어/i.test(blob);
}

/** 정보형·가이드 주제 — 방문 후기 톤 라우팅 제외용 */
export function isInformationalTopicInput(input = {}) {
  if (isLocalServicePromoTopic(input)) return false;
  if (isResearchHeavyTopicInput(input)) {
    if (
      resolveBriclogIndustryKey(input) === "furniture" &&
      (isExhibitionTopic(input) || prefersVisitExperienceTone(input))
    ) {
      return false;
    }
    return true;
  }
  if (isVisitReviewTopicInput(input)) return false;

  if (prefersVisitExperienceTone(input)) {
    const raw = topicRaw(input).toLowerCase();
    if (
      /고르는\s*법|선택\s*기준|종류\s*정리|가이드|업체\s*소개|상담\s*포인트|상담|추천\s*메뉴|이용\s*안내|관리\s*방법|예약\s*안내|고르는\s*법|패키지|클래스|견적|체험\s*포인트/.test(
        raw
      )
    ) {
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
