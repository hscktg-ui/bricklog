/**
 * BRAND JOURNALIST DIRECTIVE — 콘텐츠 생성기 → 브랜드 조사·편집 시스템
 * 검색 문장 재조합 금지 · 사실 추출·검증 · 검증된 사실만 사용
 */
import { collectMergedResearchFacts } from "@/lib/product/researchReadiness";
import { isBrandJournalistDirectiveEnforced } from "@/lib/product/missionFlags";
import { getBlogFullText } from "@/utils/qualityCheck";
import {
  isExhibitionTopic,
  isFurnitureIndustry,
} from "@/lib/product/industryContextEngine";

export const BRAND_JOURNALIST_DIRECTIVE_VERSION = "v1";
export const MIN_VERIFIED_BRAND_FACTS = 3;

const USER_INPUT_SOURCES = new Set([
  "user_input",
  "input",
  "include_phrases",
  "user",
]);

const TRUSTED_SOURCE_HINTS = [
  "official",
  "brand_engine",
  "naver",
  "gemini",
  "research",
  "faq",
  "reviews",
  "web",
  "verified",
  "store",
  "place",
];

const PROMPT_ONLY_RES = [
  /지역명은\s*자연스럽게/,
  /원문\s*복사\s*금지/,
  /검색\s*스니펫/,
  /입력\s*우선/,
  /본문\s*노출\s*금지/,
];

const SEARCH_SNIPPET_MIN_LEN = 18;
/** 검색 크롤·조사 재조합 문장 — 업종 무관 제거 */
const MECHANICAL_SNIPPET_CRAWL_RES = [
  /있는데요/,
  /많은\s*고객님이\s*추천/,
  /국내\s*1위/,
  /[가-힣A-Za-z0-9()]{2,28}\s*라인업\s*:\s*/,
  /맞춰\s*볼\s*때\s+.{6,96}가\s*참고가\s*됐/,
  /비교할\s*때\s+.{6,96}가\s*기준이\s*됐/,
  /여기\s*관련해서/,
  /\bRA\d{2,4}\b/i,
  /\bFAVOLA\b/i,
  /파보라/,
  /프리미엄\s*침대\s*라인\s*입니다/,
  /\[[^\]]{4,48}매장/,
  /신세계\s*스타필드/,
  /맞춰\s*볼\s*때\s+.{4,}/,
  /ㅎ[_]?ㅎ|ㅋㅋ|ㅎㅎ/,
  /찾아보시면\s*어떨까/,
  /~+\s*(?:찾|보|해|가|드)/,
  /(?:여친|남친)과\s*함께/,
  /다이어트\s*하는\s*여친/,
  /블로그\s*투어|맛집\s*추천\s*글/,
  /종합적으로\s*보면|많은\s*분들께|도움이\s*되(?:시길|길)/,
];
const LATIN_LEAK_TOKEN_RE = /\b[A-Z][A-Za-z]{2,18}\b/g;
const KOREAN_LEAK_STOP_RE =
  /후기|추천|매장|방문|확인|고객|브랜드|국내|제품|신제품|할인|행사|체험|정보|소개|리뷰|베스트|인기|공식|운영|시간|주소|예약|전화|주차|영업|쇼룸|매트리스|침대|가구|전시|라인업|프리미엄|많은|다양한|제공|편안|경도|옵션|수면|선택|비교|혜택|가격|구성|모델|포인트|기준|안내|조건|시즌|한정|요일|당일|관련|있는데|입니다|추천하는|고객님|높인|분산|경험|만족|편리|방법|이용|구매|설치|배송|교환|반품|보증|재고|상담|대기|주말|평일|오전|오후|휴무|위치|근처|지역|생활|동네|신혼|침실|허리|숙면|불편|고민|정리|메모|직접|보러|다녀|쇼룸|현장|당일|맞춰|여기|관련해서/;

function isExhibitionLeakContext(input = {}) {
  if (isFurnitureIndustry(input)) return true;
  if (!isExhibitionTopic(input)) return false;
  const blob = `${input.topic || ""} ${input.mainKeyword || ""} ${input.industry || ""} ${input.brandName || ""}`;
  return /가구|침대|매트리스|오피모|쇼룸|bed/i.test(blob);
}

function sentenceHasMechanicalSnippetCrawl(sentence = "") {
  const s = String(sentence || "").trim();
  if (!s) return false;
  return MECHANICAL_SNIPPET_CRAWL_RES.some((re) => re.test(s));
}

/** 송출 직전 — 검색 스니펫·잡담·타 업종 문장 제거 대상 */
export function shouldStripDeliverySentence(sentence = "", input = {}) {
  const s = String(sentence || "").trim();
  if (!s || s.replace(/\s/g, "").length < 8) return false;
  if (sentenceHasMechanicalSnippetCrawl(s)) return true;
  if (sentenceHasSearchSnippetChunk(s, input)) return true;
  if (textContainsUnverifiedSearchLeak(s, input)) return true;
  return false;
}

function userContextBlob(input = {}) {
  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  const topic = String(input.topic || input.mainKeyword || "").trim();
  return `${brand} ${region} ${topic}`.toLowerCase();
}

function tokenInUserContext(token, input = {}) {
  const t = String(token || "").trim();
  if (t.length < 2) return true;
  const blob = userContextBlob(input);
  if (blob.includes(t.toLowerCase())) return true;
  const brand = String(input.brandName || "").trim();
  const topic = String(input.topic || input.mainKeyword || "").trim();
  if (brand && brand.includes(t)) return true;
  if (topic && topic.includes(t)) return true;
  return false;
}

/** 검색 결과에서 본문에 넣으면 안 되는 미검증 경쟁·타사 토큰 (전시 주제) */
export function collectUnverifiedSearchLeakTokens(input = {}) {
  if (!isExhibitionLeakContext(input)) return [];
  const results = collectWebSearchResults(input);
  if (!results.length) return [];

  const verifiedBlob = collectMergedResearchFacts(input)
    .filter((row) => classifyFactVerification(row, input).verified)
    .map((row) => String(row?.fact || row || "").toLowerCase())
    .join(" ");

  const tokens = new Set();
  for (const r of results) {
    const title = String(r.title || "").trim();
    const snippet = String(r.snippet || r.description || "").trim();
    for (const blob of [title, snippet]) {
      if (!blob) continue;
      for (const m of blob.match(LATIN_LEAK_TOKEN_RE) || []) {
        if (!tokenInUserContext(m, input) && !verifiedBlob.includes(m.toLowerCase())) {
          tokens.add(m);
        }
      }
      for (const word of blob.match(/[가-힣]{3,}/g) || []) {
        if (tokenInUserContext(word, input)) continue;
        if (KOREAN_LEAK_STOP_RE.test(word)) continue;
        if (verifiedBlob.includes(word)) continue;
        if (title.includes(word) || (snippet.includes(word) && word.length >= 4)) {
          tokens.add(word);
        }
      }
    }
  }
  return [...tokens];
}

export function textContainsUnverifiedSearchLeak(text, input = {}) {
  const t = String(text || "");
  if (!t || !isExhibitionLeakContext(input)) return false;
  return collectUnverifiedSearchLeakTokens(input).some((tok) => t.includes(tok));
}

function sentenceHasSearchSnippetChunk(sentence, input = {}) {
  const s = String(sentence || "").trim();
  if (!s) return false;
  const results = collectWebSearchResults(input);
  for (const r of results) {
    const title = String(r.title || "").trim();
    if (title.length >= SEARCH_SNIPPET_MIN_LEN && s.includes(title)) return true;
    const snippet = String(r.snippet || r.description || "").trim();
    if (snippet.length >= 24) {
      const chunk = snippet.replace(/\s+/g, " ").trim().slice(0, 48);
      if (chunk.length >= 20 && s.includes(chunk)) return true;
    }
  }
  return false;
}

export function stripSearchSnippetLeakFromText(text, input = {}) {
  const raw = String(text || "").trim();
  if (!raw) return raw;

  const parts = raw.split(/(?<=[.!?。])\s+|\n+/);
  const kept = [];
  for (const sentence of parts) {
    const s = sentence.trim();
    if (!s || s.replace(/\s/g, "").length < 8) continue;
    if (sentenceHasMechanicalSnippetCrawl(s)) continue;
    if (sentenceHasSearchSnippetChunk(s, input)) continue;
    if (textContainsUnverifiedSearchLeak(s, input)) continue;
    kept.push(s);
  }
  return kept.join("\n\n").trim();
}

export function stripSearchSnippetLeakFromPack(pack, input = {}) {
  if (!pack) return pack;
  const strip = (text) => stripSearchSnippetLeakFromText(text, input);
  return {
    ...pack,
    title: strip(pack.title),
    representativeTitle: strip(pack.representativeTitle),
    sections: (pack.sections || []).map((sec) => ({
      ...sec,
      heading: strip(sec.heading || ""),
      body: strip(sec.body || ""),
    })),
    conclusion: pack.conclusion ? strip(pack.conclusion) : pack.conclusion,
    intro: pack.intro ? strip(pack.intro) : pack.intro,
  };
}

function isUserInputOnlyFact(row = {}) {
  const src = String(row?.source || "").toLowerCase();
  const text = String(row?.fact || row || "").trim();
  return (
    USER_INPUT_SOURCES.has(src) ||
    /사용자가 입력|입력한 핵심 주제/.test(text)
  );
}

function isPromptOnlyFact(text = "") {
  const t = String(text || "").trim();
  return PROMPT_ONLY_RES.some((re) => re.test(t));
}

function factMentionsBrand(row = {}, brand = "") {
  const b = String(brand || "").trim();
  if (!b || b.length < 2) return false;
  const text = String(row?.fact || row || "").trim();
  return text.includes(b);
}

function isBrandRelatedFact(row = {}, brand = "") {
  const axis = String(row?.axis || "mixed").toLowerCase();
  if (axis === "brand") return true;
  if (factMentionsBrand(row, brand)) return true;
  const src = String(row?.source || "").toLowerCase();
  return src === "brand_engine";
}

/**
 * @returns {{ verified: boolean, confidence?: number, reason?: string }}
 */
export function classifyFactVerification(row = {}, input = {}) {
  const text = String(row?.fact || row || "").trim();
  if (!text || text.length < 6 || isPromptOnlyFact(text)) {
    return { verified: false, reason: "prompt_only" };
  }
  if (isUserInputOnlyFact(row)) {
    return { verified: false, reason: "user_input_unverified" };
  }
  if (row?.verified === true || row?.verificationStatus === "verified") {
    return { verified: true, confidence: 0.95 };
  }
  const src = String(row?.source || "").toLowerCase();
  if (TRUSTED_SOURCE_HINTS.some((h) => src.includes(h))) {
    return { verified: true, confidence: 0.8 };
  }
  if (src && !USER_INPUT_SOURCES.has(src)) {
    return { verified: true, confidence: 0.6 };
  }
  if (/공식|확인|매장\s*안내|운영\s*시간|주소/.test(text)) {
    return { verified: true, confidence: 0.55 };
  }
  const brand = String(input.brandName || "").trim();
  if (
    brand &&
    factMentionsBrand(row, brand) &&
    text.length >= 12 &&
    !isPromptOnlyFact(text)
  ) {
    return { verified: true, confidence: 0.48 };
  }
  return { verified: false, reason: "unverified_source" };
}

/** 검증된 브랜드 관련 사실만 */
export function collectVerifiedBrandFacts(input = {}, parsed = {}, research = {}) {
  const brand = String(input.brandName || "").trim();
  const merged = collectMergedResearchFacts(input, parsed, research);
  const seen = new Set();
  const out = [];

  for (const row of merged) {
    if (!isBrandRelatedFact(row, brand)) continue;
    const verification = classifyFactVerification(row, input);
    if (!verification.verified) continue;
    const key = String(row?.fact || row).slice(0, 72).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...row, verification });
  }
  return out;
}

function collectWebSearchResults(input = {}) {
  const web =
    input._webLeadsCache ||
    input.searchExpansion?.webLeads ||
    input.research?.webLeads ||
    input.knowledgeExpansion?.searchExpansion?.webLeads;
  return web?.results || [];
}

function computeTrustScore(verifiedBrandFacts = [], input = {}) {
  const count = verifiedBrandFacts.length;
  let score = Math.min(40, count * 8);
  const sources = new Set(
    verifiedBrandFacts.map((f) => String(f?.source || "unknown").toLowerCase())
  );
  score += Math.min(25, sources.size * 6);
  if (input.brandWikiReadiness?.ok || (input.brandWiki?.entryCount ?? input.brandWiki?.count ?? 0) >= 3) {
    score += 15;
  }
  if (hasAnyWebEvidence(input)) score += 10;
  if (String(input.includePhrases || "").trim().length >= 12) score += 5;
  return Math.min(100, Math.round(score));
}

function hasAnyWebEvidence(input = {}) {
  return collectWebSearchResults(input).length > 0;
}

function buildMissingInformationList(verifiedCount, input = {}) {
  const missing = [];
  const brand = String(input.brandName || "").trim();
  if (verifiedCount < MIN_VERIFIED_BRAND_FACTS) {
    missing.push(
      `브랜드(${brand || "미입력"}) 관련 확인된 사실이 ${MIN_VERIFIED_BRAND_FACTS}개 미만`
    );
  }
  if (!hasAnyWebEvidence(input)) {
    missing.push("공개 검색·공식 안내에서 확인 가능한 출처 부족");
  }
  const hasOfficial = collectVerifiedBrandFacts(input).some((f) =>
    /official|공식|매장|운영/.test(
      `${f?.source || ""} ${f?.fact || ""}`
    )
  );
  if (!hasOfficial) missing.push("공식·매장 운영 정보(위치·시간·연락) 미확인");
  const hasProduct = collectVerifiedBrandFacts(input).some(
    (f) => String(f?.axis || "").toLowerCase() === "brand" || /제품|메뉴|라인업/.test(f?.fact || "")
  );
  if (!hasProduct) missing.push("제품·서비스·메뉴 등 브랜드 고유 특징 미확인");
  return [...new Set(missing)];
}

/**
 * 본문 작성 전 — 조사 리포트 · 신뢰도 · 부족 정보
 */
export function buildBrandInvestigationReport(input = {}, parsed = {}, research = {}) {
  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  const topic =
    String(input.topic || "").trim() ||
    String(input.mainKeyword || "").trim();
  const verifiedBrandFacts = collectVerifiedBrandFacts(input, parsed, research);
  const trustScore = computeTrustScore(verifiedBrandFacts, input);
  const missingInformation = buildMissingInformationList(
    verifiedBrandFacts.length,
    { ...input, brandWikiReadiness: input.brandWikiReadiness, brandWiki: input.brandWiki }
  );

  const factLines = verifiedBrandFacts.slice(0, 10).map((row, i) => {
    const axis = row?.axis || "brand";
    const fact = String(row?.fact || "").trim();
    return `${i + 1}. [${axis}] ${fact}`;
  });

  const investigationReport = [
    `【조사 리포트 · ${BRAND_JOURNALIST_DIRECTIVE_VERSION}】`,
    `브랜드: ${brand || "(미입력)"} · 지역: ${region || "(미입력)"} · 주제: ${topic || "(미입력)"}`,
    `검증된 브랜드 관련 사실: ${verifiedBrandFacts.length}건`,
    factLines.length ? "— 확인된 사실 —" : "— 확인된 사실 없음 —",
    ...factLines,
    `신뢰도 점수: ${trustScore}/100`,
    missingInformation.length
      ? `부족한 정보: ${missingInformation.join(" · ")}`
      : "부족한 정보: 없음(작성 가능)",
  ].join("\n");

  return {
    version: BRAND_JOURNALIST_DIRECTIVE_VERSION,
    investigationReport,
    trustScore,
    missingInformation,
    verifiedBrandFactCount: verifiedBrandFacts.length,
    verifiedBrandFacts,
    brand,
    region,
    topic,
    readyForWrite: verifiedBrandFacts.length >= MIN_VERIFIED_BRAND_FACTS,
  };
}

export const CUSTOMER_BRAND_FACTS_INSUFFICIENT_MESSAGE =
  "브랜드 관련 확인된 정보가 아직 부족해요. 「포함할 내용」에 매장·제품 특징을 적거나, 잠시 후 「조사 후 글 받기」를 다시 눌러 주세요.";

/**
 * 작성 전 하드 게이트 — 검증된 브랜드 사실 5개 미만이면 생성 금지
 */
export function evaluateBrandJournalistWriteGate(input = {}, parsed = {}, research = {}) {
  if (!isBrandJournalistDirectiveEnforced()) {
    return { ok: true, skipped: true, reasons: [] };
  }
  if (input.publicTestMode && input.brandJournalistStrict !== true) {
    return { ok: true, skipped: true, publicTestBypass: true, reasons: [] };
  }

  const report = buildBrandInvestigationReport(input, parsed, research);
  if (report.verifiedBrandFactCount < MIN_VERIFIED_BRAND_FACTS) {
    return {
      ok: false,
      stage: "brand_investigation",
      reasons: ["insufficient_verified_brand_facts"],
      userMessage: CUSTOMER_BRAND_FACTS_INSUFFICIENT_MESSAGE,
      ...report,
    };
  }

  return {
    ok: true,
    stage: "brand_investigation",
    reasons: [],
    userMessage: null,
    ...report,
  };
}

export function buildBrandJournalistPromptBlock() {
  return `【BRAND JOURNALIST DIRECTIVE · 브랜드 조사·편집 시스템】
브릭로그는 작가가 아니다. 브랜드 기자이자 편집자다.
- 목표: 새로운 사실을 전달한다. 좋은 글보다 좋은 설명을 우선한다.
- 검색결과를 문장으로 재조합하지 말 것. 검색에서 사실(Fact)만 추출한다.
- 추출한 사실을 검증하고, 검증된 사실만 본문에 사용한다.
- 검색결과 제목·스니펫·원문 문장을 본문에 직접 삽입하지 말 것.
- 본문 작성 전 조사 리포트·신뢰도·부족 정보를 먼저 정리한다.
- 주제를 설명할 수 없거나 새 사실을 제공하지 못하는 글은 발행하지 않는다.`;
}

export function formatBrandInvestigationBrief(report = {}) {
  if (!report?.investigationReport) return "";
  return [
    report.investigationReport,
    "",
    "【편집 지시】위 검증된 사실만 재해석·편집. 검색 문장 복사 금지.",
  ].join("\n");
}

/** 검색 제목·스니펫이 본문에 그대로 들어갔는지 */
export function detectSearchSnippetLeak(pack, input = {}) {
  const results = collectWebSearchResults(input);
  if (!results.length) return { ok: true, hits: [], count: 0 };

  const full = getBlogFullText(pack);
  const hits = [];

  for (const r of results) {
    const title = String(r.title || "").trim();
    if (title.length >= SEARCH_SNIPPET_MIN_LEN && full.includes(title)) {
      hits.push({ type: "search_title", text: title.slice(0, 80) });
    }
    const snippet = String(r.snippet || r.description || "").trim();
    if (snippet.length >= 24) {
      const chunk = snippet.replace(/\s+/g, " ").trim().slice(0, 48);
      if (chunk.length >= 20 && full.includes(chunk)) {
        hits.push({ type: "search_snippet", text: chunk });
      }
    }
  }

  if (isExhibitionLeakContext(input)) {
    for (const tok of collectUnverifiedSearchLeakTokens(input)) {
      if (full.includes(tok)) {
        hits.push({ type: "unverified_search_token", text: tok.slice(0, 40) });
      }
    }
  }

  return { ok: hits.length === 0, hits, count: hits.length };
}

function factReflectedInText(factText, full) {
  const tokens = String(factText || "")
    .split(/\s+/)
    .filter((t) => t.replace(/[^\w가-힣]/g, "").length >= 2)
    .slice(0, 5);
  return tokens.filter((t) => full.includes(t)).length >= 2;
}

/**
 * 검증된 브랜드 사실이 본문에 반영되도록 자연 문장으로 보강
 */
export function weaveVerifiedBrandFactsForPublish(pack, input = {}) {
  if (!pack?.sections?.length) return pack;

  const investigation =
    input.brandInvestigationReport || buildBrandInvestigationReport(input);
  const verified = investigation.verifiedBrandFacts || collectVerifiedBrandFacts(input);
  if (!verified.length) return pack;

  const brand = String(input.brandName || "브랜드").trim();
  let full = getBlogFullText(pack);
  let reflected = verified.filter((row) =>
    factReflectedInText(row?.fact || row, full)
  ).length;
  const minReflected = Math.min(3, Math.max(1, verified.length));
  if (reflected >= minReflected) return pack;

  const sections = [...pack.sections];
  for (let i = 0; reflected < minReflected && i < verified.length; i += 1) {
    const row = verified[i];
    const fact = String(row?.fact || row).trim();
    if (!fact || factReflectedInText(fact, full)) continue;

    const tail = fact.length > 72 ? `${fact.slice(0, 68)}…` : fact;
    const line = `${brand} 안내 기준으로 ${tail}를 정리해 봤어요.`;
    const secIdx = i % sections.length;
    const existing = String(sections[secIdx]?.body || "").trim();
    if (existing.includes(line.slice(0, 14))) continue;
    sections[secIdx] = {
      ...sections[secIdx],
      body: `${existing}\n\n${line}`.trim(),
    };
    full = getBlogFullText({ ...pack, sections });
    reflected = verified.filter((row2) =>
      factReflectedInText(row2?.fact || row2, full)
    ).length;
  }

  return {
    ...pack,
    sections,
    _meta: {
      ...(pack._meta || {}),
      verifiedBrandFactsWoven: true,
      brandInvestigationReport: investigation,
    },
  };
}

/**
 * 발행 전 — 검증된 사실이 독자에게 새 정보로 전달되는지
 */
export function assessNoNewFactsForPublish(pack, input = {}, report = null) {
  if (!isBrandJournalistDirectiveEnforced()) {
    return { ok: true, skipped: true };
  }

  const investigation =
    report ||
    input.brandInvestigationReport ||
    buildBrandInvestigationReport(input);

  if (investigation.verifiedBrandFactCount < MIN_VERIFIED_BRAND_FACTS) {
    return {
      ok: false,
      reasons: ["insufficient_verified_brand_facts"],
      investigation,
    };
  }

  const verified = investigation.verifiedBrandFacts || [];
  const full = getBlogFullText(pack);
  let reflected = 0;

  for (const row of verified) {
    const tokens = String(row?.fact || "")
      .split(/\s+/)
      .filter((t) => t.replace(/[^\w가-힣]/g, "").length >= 2)
      .slice(0, 5);
    const matched = tokens.filter((t) => full.includes(t)).length;
    if (matched >= 2) reflected += 1;
  }

  const minReflected = Math.min(3, Math.max(1, verified.length));
  if (reflected < minReflected) {
    return {
      ok: false,
      reasons: ["no_new_verified_facts"],
      reflected,
      minReflected,
      investigation,
    };
  }

  const snippetLeak = detectSearchSnippetLeak(pack, input);
  if (!snippetLeak.ok) {
    return {
      ok: false,
      reasons: ["search_snippet_leak"],
      snippetLeak,
      investigation,
    };
  }

  return { ok: true, reflected, investigation };
}
