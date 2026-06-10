/**
 * 야간 장문 테스트 — 기존 4종(꽃·체어·카페·마케팅) 제외, 미검증 업종 × 고객 관점
 * blogLengthTier: medium
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildMissionProseFallbackPack } from "../lib/llm/missionProseFallback.js";
import { enrichMinimalBlogInput } from "../lib/llm/blogDeliveryFallback.js";
import { finalizeContentQualityForDelivery } from "../lib/product/contentQualityDelivery.js";
import { assessContentEvaluation } from "../lib/product/contentEvaluationEngine.js";
import { assessCustomerPerspective } from "../lib/product/customerPerspectiveAssessment.js";
import {
  assessOvernightSampleQuality,
  ensureResearchFirstDossier,
} from "../lib/product/overnightQualityPipeline.js";
import { runResearchFirstPipeline } from "../lib/product/briclogResearchFirstPipeline.js";
import { resolveBriclogIndustryKey } from "../lib/product/industryContextEngine.js";
import { shouldUseEditorialQualityPath } from "../lib/product/editorialQualityStandard.js";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { countBlogBodyCharsWithSpaces } from "../lib/prompts/engine/textUtils.js";
import { resolveBlogLengthTier } from "../lib/constants.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.BRICLOG_MISSION = "true";
process.env.BRICLOG_RESET_QUALITY = "true";
process.env.BRICLOG_EXPERIENCE_OPINION = "true";
process.env.BRICLOG_RESEARCH_FIRST = "true";

const MEDIUM = resolveBlogLengthTier("medium");

/** 기존 overnight 4종 제외 — 고객 시나리오 중심 */
const CATEGORY_SAMPLES = [
  {
    id: "salon",
    customerScenario: "첫 염색이라 두피 상담이 필요한 직장인",
    input: {
      brandName: "리본헤어",
      region: "서울 송파",
      topic: "겨울 두피 염색 상담",
      industry: "미용실",
      storeFeatures: "두피 진단, 저자극 염색, 저녁 예약",
      purposeType: "info",
      blogLengthTier: "medium",
    },
    minEval: 82,
    minCustomer: 75,
  },
  {
    id: "hospital",
    customerScenario: "면역 관리 한방 상담을 찾는 40대",
    input: {
      brandName: "바른한의원",
      region: "인천 부평",
      topic: "겨울철 면역 한방 관리",
      industry: "한의원",
      storeFeatures: "체질 상담, 한약 처방, 야간 진료",
      purposeType: "info",
      blogLengthTier: "medium",
    },
    minEval: 82,
    minCustomer: 75,
  },
  {
    id: "pet_snack",
    customerScenario: "첫 수제 간식을 고르는 반려견 보호자",
    input: {
      brandName: "더건강하개",
      region: "대구 수성",
      topic: "강아지 수제 간식 고르는 법",
      industry: "반려동물 간식",
      storeFeatures: "국내산 원료, 무첨가, 소량 패키지",
      purposeType: "info",
      blogLengthTier: "medium",
    },
    minEval: 82,
    minCustomer: 75,
  },
  {
    id: "restaurant",
    customerScenario: "가족 모임 식당 메뉴를 비교하는 고객",
    input: {
      brandName: "바다향해물찜",
      region: "부산 해운대",
      topic: "가족 모임 추천 메뉴",
      industry: "음식점",
      storeFeatures: "해물찜 전문, 룸 좌석, 주차 가능",
      purposeType: "info",
      blogLengthTier: "medium",
    },
    minEval: 82,
    minCustomer: 75,
  },
  {
    id: "pension",
    customerScenario: "여름 바베큐 펜션을 예약하려는 가족",
    input: {
      brandName: "속초바다뷰펜션",
      region: "강원 속초",
      topic: "가족 여름 바베큐 패키지",
      industry: "펜션",
      storeFeatures: "바다뷰, 바베큐장, 키즈존",
      purposeType: "info",
      blogLengthTier: "medium",
    },
    minEval: 80,
    minCustomer: 70,
  },
  {
    id: "education",
    customerScenario: "퇴근 후 영어 회화반을 찾는 직장인",
    input: {
      brandName: "톡앤톡영어",
      region: "대전 유성",
      topic: "성인 직장인 영어 회화 수업",
      industry: "학원",
      storeFeatures: "소규모 반, 레벨 테스트, 저녁 반",
      purposeType: "info",
      blogLengthTier: "medium",
    },
    minEval: 80,
    minCustomer: 70,
  },
  {
    id: "craft",
    customerScenario: "여행 중 원데이 도자기 체험을 예약하는 커플",
    input: {
      brandName: "흙플레이",
      region: "제주 애월",
      topic: "원데이 도자기 클래스 예약",
      industry: "공방",
      storeFeatures: "초보 환영, 건조·포장, 주차",
      purposeType: "info",
      blogLengthTier: "medium",
    },
    minEval: 80,
    minCustomer: 70,
  },
  {
    id: "construction",
    customerScenario: "원룸 리모델 견적을 비교하는 1인 가구",
    input: {
      brandName: "우리집인테리어",
      region: "서울 강서",
      topic: "원룸 리모델 견적 비교",
      industry: "인테리어",
      storeFeatures: "부분 시공, 3D 도면, A/S 1년",
      purposeType: "info",
      blogLengthTier: "medium",
    },
    minEval: 80,
    minCustomer: 70,
  },
  {
    id: "tea_cafe",
    customerScenario: "조용한 티코스를 찾는 차 애호가",
    input: {
      brandName: "차향다실",
      region: "전주 한옥마을",
      topic: "여름 차 추천과 티코스",
      industry: "티 카페",
      storeFeatures: "티코스, 다실 좌석, 시즌 블렌딩",
      purposeType: "info",
      blogLengthTier: "medium",
    },
    minEval: 80,
    minCustomer: 70,
  },
  {
    id: "pet_cafe",
    customerScenario: "대형견과 함께 갈 애견 카페를 찾는 보호자",
    input: {
      brandName: "멍멍플레이",
      region: "경기 성남",
      topic: "대형견 동반 애견카페 이용 안내",
      industry: "애견카페",
      storeFeatures: "대형견 구역, 리드줄 대여, 간식 메뉴",
      purposeType: "info",
      blogLengthTier: "medium",
    },
    minEval: 80,
    minCustomer: 70,
  },
  {
    id: "furniture_mattress",
    customerScenario: "매트리스 체험 전 비교 기준을 정리하는 고객",
    input: {
      brandName: "템퍼",
      region: "평택",
      topic: "매트리스 고르는 법과 체험 포인트",
      industry: "가구",
      storeFeatures: "쇼룸 체험, 10년 보증, 배송 설치",
      purposeType: "info",
      blogLengthTier: "medium",
    },
    minEval: 80,
    minCustomer: 70,
  },
  {
    id: "carwash",
    customerScenario: "겨울철 세차·코팅을 알아보는 운전자",
    input: {
      brandName: "클린워시",
      region: "용인 수지",
      topic: "겨울철 세차 코팅 선택 기준",
      industry: "세차",
      storeFeatures: "셀프세차, 실내 건조, 코팅 패키지",
      purposeType: "info",
      blogLengthTier: "medium",
    },
    minEval: 78,
    minCustomer: 68,
  },
];

const results = [];
const failures = [];

for (const sample of CATEGORY_SAMPLES) {
  const enriched = ensureResearchFirstDossier(enrichMinimalBlogInput(sample.input));
  const dossier = runResearchFirstPipeline(enriched);
  const industryKey = resolveBriclogIndustryKey(enriched);
  const editorial = shouldUseEditorialQualityPath(enriched);

  let pack = buildMissionProseFallbackPack(enriched);
  if (!pack?.sections?.length) {
    failures.push({ id: sample.id, reason: "empty_pack" });
    continue;
  }

  pack = finalizeContentQualityForDelivery(pack, enriched, "blog");
  const full = getBlogFullText(pack);
  const bodyChars = countBlogBodyCharsWithSpaces(pack);
  const eval_ = assessContentEvaluation(pack, enriched);
  const customer = assessCustomerPerspective(pack, enriched);
  const overnight = assessOvernightSampleQuality(pack, {
    ...enriched,
    researchFirstDossier: dossier,
  });

  const row = {
    id: sample.id,
    customerScenario: sample.customerScenario,
    industryKey,
    editorialPath: editorial,
    bodyChars,
    lengthTierMin: MEDIUM.min,
    evalScore: eval_.score,
    evalPass: eval_.pass,
    customerScore: customer.score,
    customerPass: customer.pass,
    overnightScore: overnight.score,
    customerChecks: customer.checks,
    evalHardReasons: eval_.hardReasons || [],
  };
  results.push(row);
  console.log(JSON.stringify(row, null, 2));

  try {
    assert.ok(pack.sections?.length >= 3, `${sample.id} sections`);
    assert.ok(!/전시\s*소식|좋은내용|undefined/.test(full), `${sample.id} contamination`);
    assert.ok(bodyChars >= MEDIUM.min * 0.18, `${sample.id} length (${bodyChars})`);
    assert.ok(eval_.score >= sample.minEval, `${sample.id} eval >= ${sample.minEval}`);
    assert.ok(customer.score >= sample.minCustomer, `${sample.id} customer >= ${sample.minCustomer}`);
    assert.equal(customer.checks.noVisitFictionLeak, true, `${sample.id} no visit fiction`);
    assert.equal(overnight.checks.noPlaceholder, true, `${sample.id} placeholder`);
  } catch (err) {
    failures.push({ id: sample.id, reason: err.message });
  }
}

const avgEval =
  results.reduce((a, r) => a + r.evalScore, 0) / Math.max(results.length, 1);
const avgCustomer =
  results.reduce((a, r) => a + r.customerScore, 0) / Math.max(results.length, 1);

const summary = {
  tested: results.length,
  failures: failures.length,
  avgEvalScore: Math.round(avgEval),
  avgCustomerScore: Math.round(avgCustomer),
  failureDetails: failures,
};
console.log(JSON.stringify({ summary }, null, 2));

const reportPath = path.join(__dirname, "..", "OVERNIGHT-CATEGORY-LONG-REPORT.json");
fs.writeFileSync(reportPath, JSON.stringify({ summary, results, failures }, null, 2));

if (failures.length) {
  console.error("FAILURES:", failures);
  process.exit(1);
}

assert.ok(avgEval >= 82, `avg eval >= 82 (${avgEval})`);
assert.ok(avgCustomer >= 72, `avg customer >= 72 (${avgCustomer})`);
console.log("OK: overnight category long test");
console.log("Report:", reportPath);
