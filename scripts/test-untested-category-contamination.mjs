/**
 * 미시도 업종 — 제품 가이드 패드·업종 오염 회귀
 */
import { buildMissionProseFallbackPack } from "../lib/llm/missionProseFallback.js";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { isInformationalTopicInput, isLocalServicePromoTopic } from "../lib/content/topicFacetEngine.js";
import { detectIntrusionPhrasesForIndustry } from "../lib/pipeline/v2/industryLock.js";

process.env.BRICLOG_MISSION = "true";

const PRODUCT_PAD_RE = /색감·보관|성분·보관|알레르기·원재료|첨가물·알레르기|선물·반려·집에서\s*먹기/;

const SCENARIOS = [
  {
    id: "academy",
    input: {
      brandName: "수학플러스",
      region: "대구 동성로",
      topic: "여름방학 특강 모집",
      mainKeyword: "대구 수학학원",
      industry: "학원",
      storeFeatures: "소수정예·내신 대비",
      blogLengthTier: "short",
      v4Speaker: "expert_info",
    },
    mustNot: PRODUCT_PAD_RE,
    mustMatch: /특강|학년|커리큘럼|등록|수업/,
  },
  {
    id: "craft",
    input: {
      brandName: "도자기온",
      region: "이천",
      topic: "원데이 클래스 오픈",
      mainKeyword: "도자기 클래스",
      industry: "공방",
      storeFeatures: "도자기 체험·소품",
      blogLengthTier: "short",
      v4Speaker: "essay",
    },
    mustNot: PRODUCT_PAD_RE,
    mustMatch: /클래스|체험|예약|소요|난이도/,
  },
  {
    id: "salon",
    input: {
      brandName: "레이어드살롱",
      region: "홍대",
      topic: "시즌 컬러 이벤트",
      mainKeyword: "홍대 염색",
      industry: "미용실",
      storeFeatures: "시즌 컬러·펌 전문",
      blogLengthTier: "short",
      v4Speaker: "real_use",
    },
    mustNot: /알레르기·원재료|성분·보관·선물/,
    mustMatch: /염색|두피|시술|상담|톤/,
  },
];

let failed = 0;

for (const scenario of SCENARIOS) {
  if (isLocalServicePromoTopic(scenario.input) !== true) {
    console.error(`FAIL ${scenario.id}: expected local service promo routing`);
    failed += 1;
  }
  if (isInformationalTopicInput(scenario.input) === true) {
    console.error(`FAIL ${scenario.id}: should not route informational brochure`);
    failed += 1;
  }

  const pack = buildMissionProseFallbackPack(scenario.input);
  const full = getBlogFullText(pack);
  const intrusion = detectIntrusionPhrasesForIndustry(full, scenario.input);

  if (!pack?.sections?.length) {
    console.error(`FAIL ${scenario.id}: empty pack`);
    failed += 1;
    continue;
  }
  if (scenario.mustNot.test(full)) {
    console.error(`FAIL ${scenario.id}: product pad contamination`);
    console.error(full.slice(0, 400));
    failed += 1;
    continue;
  }
  if (!intrusion.ok) {
    console.error(`FAIL ${scenario.id}: industry intrusion`, intrusion.hits);
    failed += 1;
    continue;
  }
  if (!scenario.mustMatch.test(full)) {
    console.error(`FAIL ${scenario.id}: missing industry-specific content`);
    console.error(full.slice(0, 400));
    failed += 1;
    continue;
  }
  console.log(`OK ${scenario.id}: ${pack.sections.length} sections · ${full.replace(/\s/g, "").length} chars`);
}

if (failed) process.exit(1);
console.log("\nPASS: untested category contamination guard");
