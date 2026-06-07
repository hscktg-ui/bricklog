/**
 * BRAND JOURNALIST DIRECTIVE — 콘텐츠 생성기 → 브랜드 조사·편집 시스템
 * 검색 문장 재조합 금지 · 사실 추출·검증 · 검증된 사실만 사용
 */
import { collectMergedResearchFacts } from "@/lib/product/researchReadiness";
import { isBrandJournalistDirectiveEnforced } from "@/lib/product/missionFlags";
import { getBlogFullText } from "@/utils/qualityCheck";

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
  if (input.brandWikiReadiness?.ok || input.brandWiki?.entryCount >= 3) {
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
- 검색결과를 문장으로 재조합하지 말 것. 검색에서 사실(Fact)만 추출한다.
- 추출한 사실을 검증하고, 검증된 사실만 본문에 사용한다.
- 검색결과 제목·스니펫·원문 문장을 본문에 직접 삽입하지 말 것.
- 본문 작성 전 조사 리포트·신뢰도·부족 정보를 먼저 정리한다.
- 새로운 사실을 제공하지 못하는 글은 발행하지 않는다.`;
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

  return { ok: hits.length === 0, hits, count: hits.length };
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
