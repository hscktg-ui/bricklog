/**
 * 조사 → 기승전결 → 분량 (반복 없이) 회귀
 */
import { applyResearchArcLengthDeliveryPass, assessResearchArcLengthDelivery } from "../lib/content/researchArcLengthDeliveryEngine.js";
import { scoreResearchFactUtilization } from "../lib/content/researchNarrativeDeliveryEngine.js";
import { detectDuplicateKillerIssues } from "../lib/content/duplicateKillerEngine.js";
import { countBlogBodyCharsWithSpaces } from "../lib/prompts/engine/textUtils.js";
import { getBlogFullText } from "../utils/qualityCheck.js";

process.env.BRICLOG_MISSION = "true";
process.env.BRICLOG_RESET_QUALITY = "true";

const INPUT = {
  brandName: "모카 브루",
  region: "성수",
  topic: "원두 추천",
  blogLengthTier: "short",
  researchFacts: [
    { fact: "성수 매장에서 산미·바디감 프로파일을 직접 비교할 수 있다", source: "research" },
    { fact: "싱글 오리진 6종과 블렌드 4종을 시음 후 구매 가능", source: "research" },
    { fact: "주말 오후 대기가 길어 평일 오전 방문이 수월하다", source: "research" },
    { fact: "디카페인 원두도 같은 로스팅 라인으로 취급한다", source: "research" },
    { fact: "원두 200g·500g 포장 단위로 판매한다", source: "research" },
    { fact: "바리스타가 추출 방법에 맞춰 분쇄도를 맞춰 준다", source: "research" },
  ],
};

const thinPack = {
  title: "성수 원두 추천",
  sections: [
    { heading: "시작", body: "성수에서 원두를 고를 일이 생겼어요." },
    { heading: "매장", body: "모카 브루에 들어갔어요." },
    { heading: "비교", body: "향을 맡아 봤어요." },
    { heading: "정리", body: "집에서 내려 마시려고요." },
  ],
  conclusion: "다음에 또 가 볼 것 같아요.",
};

let failed = 0;
function assert(label, cond) {
  if (!cond) {
    console.error("FAIL:", label);
    failed += 1;
  } else {
    console.log("OK:", label);
  }
}

const before = countBlogBodyCharsWithSpaces(thinPack);
const next = applyResearchArcLengthDeliveryPass(thinPack, INPUT);
const after = countBlogBodyCharsWithSpaces(next);
const full = getBlogFullText(next);
const util = scoreResearchFactUtilization(next, INPUT);
const dup = detectDuplicateKillerIssues(full);
const assessed = assessResearchArcLengthDelivery(next, INPUT);

assert("length grows from research weave", after > before + 120);
assert("research facts anchored", util.anchored >= 3);
assert("no duplicate killer issues", dup.ok === true);
assert("narrative arc roles stamped", Array.isArray(next._meta?.narrativeArcRoles));
assert("research arc pass stamped", next._meta?.researchArcLengthPass === true);
assert("facts woven count > 0", (next._meta?.researchArcFactsWoven || 0) >= 1);
assert("gi/seung/jeon/gyeol spread", new Set(next._meta?.narrativeArcRoles || []).size >= 3);

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`, { before, after, util, assessed });
  process.exit(1);
}

console.log("\nPASS: research-arc-length-delivery", {
  before,
  after,
  woven: next._meta?.researchArcFactsWoven,
  utilization: util,
});
