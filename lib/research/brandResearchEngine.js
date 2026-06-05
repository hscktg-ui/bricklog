/**
 * Brand Research Engine — 조사 → 재해석 → 요약 → 생성 컨텍스트
 */
import { sanitizeText, parsePhraseList, isJunkValue } from "@/utils/sanitizeInput";
import { inferBrandProfile } from "@/lib/brands/brandPresets";
import { collectPublicSignals } from "./searchSources/mockCollector";
import {
  reinterpretSignals,
  mergeUserOverSearch,
  stripSourceCitations,
} from "./reinterpret";

function buildUserPriorityFacts(input) {
  const brandName = sanitizeText(input.brandName);
  const region = sanitizeText(input.region);
  const industry = sanitizeText(input.industryLabel || input.industry);
  const mainKeyword = sanitizeText(input.mainKeyword || input.main);
  const subKeywords = parsePhraseList(input.subKeyword || input.subKeywords);
  const includeList = parsePhraseList(input.includePhrases || input.includeList);
  const brandDescription = sanitizeText(
    input.brandDescription || input.storeFeatures
  );
  const benefit = sanitizeText(input.benefit);

  return {
    brandName,
    region,
    industry,
    mainKeyword,
    subKeywords,
    includeList,
    brandDescription,
    benefit,
    facts: [
      brandName && `브랜드: ${brandName}`,
      region && `지역: ${region}`,
      industry && `업종: ${industry}`,
      mainKeyword && `주제: ${mainKeyword}`,
      ...subKeywords.map((s) => `연관: ${s}`),
      ...includeList.map((s) => `강조(사용자): ${s}`),
      benefit && `혜택(사용자): ${benefit}`,
      brandDescription && `설명(사용자): ${brandDescription}`,
    ].filter(Boolean),
  };
}

function buildBrandSummary(user, searchVoices, collection, profile) {
  const traits = mergeUserOverSearch(
    [
      profile?.brandMood && `분위기: ${profile.brandMood}`,
      profile?.brandDescription && stripSourceCitations(profile.brandDescription),
      ...user.includeList.map((s) => reinterpretSignals([s])[0] || s),
    ].filter(Boolean),
    searchVoices
  );

  const operationStyle =
    traits.find((t) => /운영|이용|무인|예약|상담/.test(t)) ||
    (user.includeList[0] ? reinterpretSignals([user.includeList[0]])[0] : null) ||
    "입력된 범위 안에서 운영 스토리를 풀어 씁니다";

  const coreStrengths = traits.slice(0, 4);
  const recentIssues = (collection.trendTopics || []).slice(0, 3);
  const regionalTraits = [];

  return {
    brandTraits: traits.slice(0, 6),
    mainKeywords: [
      user.mainKeyword,
      ...user.subKeywords.slice(0, 3),
    ].filter(Boolean),
    operationStyle,
    coreStrengths,
    recentIssues,
    regionalTraits,
    customerInterests: collection.reviewThemes || [],
    trendHints: collection.trendTopics || [],
    uniqueness: profile
      ? `${user.brandName || "이 브랜드"} — ${profile.brandMood || profile.industry} 톤, 업종 일반론이 아닌 매장 맥락`
      : user.brandName
        ? `${user.brandName} — ${user.region ? `${user.region} ` : ""}매장 체험·행사 조건`
        : "사용자 입력을 우선합니다",
  };
}

/**
 * @param {Object} input
 * @returns {import('./types').BrandResearch}
 */
export function runBrandResearchEngine(input = {}) {
  const user = buildUserPriorityFacts(input);
  const profile = inferBrandProfile(user.brandName);
  const collection = collectPublicSignals({
    ...input,
    brandName: user.brandName,
    region: user.region,
    industryKey: input.industryKey,
    purposeType: input.purposeType || input.purpose,
  });

  const searchVoices = reinterpretSignals(collection.signals);
  const summary = buildBrandSummary(user, searchVoices, collection, profile);

  const excludeList = parsePhraseList(input.excludePhrases || input.excludeList);
  const assumedContext = [
    summary.uniqueness,
    summary.operationStyle && `운영 이해: ${summary.operationStyle}`,
    summary.coreStrengths.length
      ? `강점(재해석): ${summary.coreStrengths.join(" · ")}`
      : null,
    summary.recentIssues.length
      ? `최근 관심(트렌드 참고, 복사 금지): ${summary.recentIssues.join(" · ")}`
      : null,
    user.region && user.mainKeyword
      ? `${user.region}에서 ${user.mainKeyword} — 비교·방문 고민 맥락`
      : null,
    "출처·검색·기사 인용 문구 본문 노출 금지",
    "홈페이지·리뷰 문장 원문 복사 금지",
  ].filter((p) => !isJunkValue(p));

  const cautionNotes = [
    "사용자 입력과 충돌 시 사용자 입력 우선",
    "입력에 없는 가격·주소·의료 효과 단정 금지",
    excludeList.length ? `제외: ${excludeList.join(", ")}` : null,
    input.industryKey === "hospital" || /병원|의원/.test(user.industry || "")
      ? "의료 — 효과·완치 표현 금지"
      : null,
  ].filter(Boolean);

  const sourceStatus = collection.hasSearchData
    ? "search_inferred"
    : "user_input_only";

  return {
    brandName: user.brandName || null,
    industry: user.industry || null,
    region: user.region || null,
    knownFacts: user.facts,
    assumedContext,
    cautionNotes,
    sourceStatus,
    excludeList,
    includeList: user.includeList,
    mainKeyword: user.mainKeyword,
    subKeywords: user.subKeywords,
    brandDescription: user.brandDescription,
    brandProfile: profile,
    inferredTraits: profile
      ? {
          tone: profile.tone,
          kpiGoal: profile.kpiGoal,
          writingStyle: profile.writingStyle,
          placeStyle: profile.placeStyle,
          instagramMood: profile.instagramMood,
        }
      : null,
    collection,
    summary,
    searchVoices,
    noCopyRule:
      "검색·홈페이지·기사·리뷰 원문 복사 금지 — 재해석한 말로만 작성",
  };
}
