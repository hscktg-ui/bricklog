/**
 * 미시도 업종 — research-first + 업종 오염 회귀 (예시 라우트 아님)
 */
import { buildMissionProseFallbackPack } from "../lib/llm/missionProseFallback.js";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { isInformationalTopicInput, isLocalServicePromoTopic } from "../lib/content/topicFacetEngine.js";
import { detectIntrusionPhrasesForIndustry } from "../lib/pipeline/v2/industryLock.js";

process.env.BRICLOG_MISSION = "true";
process.env.BRICLOG_RESET_QUALITY = "true";

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
      researchFacts: [
        { fact: "여름방학 특강은 중1·중2·고1 학년별 4주 과정으로 운영" },
        { fact: "등록은 6월 말까지 선착순, 소수정예 8명 내외" },
        { fact: "내신 대비 문제풀이·오답 클리닉 포함" },
        { fact: "대구 동성로 캠퍼스 평일 오후 2시부터 수업" },
      ],
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
      researchFacts: [
        { fact: "원데이 클래스는 2시간, 초보자도 가능한 난이도" },
        { fact: "예약은 네이버 예약 또는 전화, 최대 6명" },
        { fact: "완성품은 2주 후 픽업, 포장 제공" },
        { fact: "이천 도자기 체험·소품 제작 프로그램" },
      ],
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
      researchFacts: [
        { fact: "시즌 컬러 이벤트는 6월 한 달, 염색·펌 20% 할인" },
        { fact: "두피 상담 후 톤 추천, 사전 예약 필수" },
        { fact: "시술 시간 염색 기준 2~3시간" },
        { fact: "홍대역 도보 5분, 펌·염색 전문 디자이너 3명" },
      ],
    },
    mustNot: /알레르기·원재료|성분·보관·선물/,
    mustMatch: /염색|두피|시술|상담|톤/,
  },
];

let failed = 0;

for (const scenario of SCENARIOS) {
  if (isLocalServicePromoTopic(scenario.input) !== true) {
    console.error(`FAIL ${scenario.id}: expected local service promo facet`);
    failed += 1;
  }
  if (isInformationalTopicInput(scenario.input) === true) {
    console.error(`FAIL ${scenario.id}: should not route informational brochure`);
    failed += 1;
  }

  const withheld = buildMissionProseFallbackPack({
    ...scenario.input,
    researchFacts: [],
  });
  if (withheld?.sections?.length || !withheld?._meta?.researchFirstWithheld) {
    console.error(`FAIL ${scenario.id}: expected research-first withhold without facts`);
    failed += 1;
  }

  const pack = buildMissionProseFallbackPack(scenario.input);
  const full = getBlogFullText(pack);
  const intrusion = detectIntrusionPhrasesForIndustry(full, scenario.input);

  if (!pack?.sections?.length) {
    console.error(`FAIL ${scenario.id}: empty pack with research facts`);
    failed += 1;
    continue;
  }
  if (pack._meta?.missionProseFallback !== true && !pack._meta?.researchGroundedHumanPack) {
    console.error(`FAIL ${scenario.id}: expected research-grounded fallback meta`);
    failed += 1;
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
console.log("\nPASS: untested category contamination guard (research-first)");
