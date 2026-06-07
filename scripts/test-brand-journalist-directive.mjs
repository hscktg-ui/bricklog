/**
 * BRAND JOURNALIST DIRECTIVE — 사실 추출·검증·5건 게이트·검색 스니펫 차단
 */
import assert from "node:assert/strict";
import {
  MIN_VERIFIED_BRAND_FACTS,
  buildBrandInvestigationReport,
  buildBrandJournalistPromptBlock,
  classifyFactVerification,
  collectVerifiedBrandFacts,
  detectSearchSnippetLeak,
  evaluateBrandJournalistWriteGate,
  assessNoNewFactsForPublish,
} from "../lib/product/brandJournalistDirective.js";
import { buildBriclogMissionPromptBlock } from "../lib/product/briclogMission.js";
import { evaluateResearchWriteGate } from "../lib/product/researchReadiness.js";

const baseInput = {
  brandName: "라온커피",
  region: "판교",
  topic: "콜드브루",
};

const thinFacts = [
  { axis: "brand", fact: "라온커피 판교점 주말 10시 오픈", source: "official" },
];

assert.equal(
  collectVerifiedBrandFacts(baseInput, { facts: thinFacts }, {}).length,
  1
);

const blocked = evaluateBrandJournalistWriteGate(
  baseInput,
  { facts: thinFacts },
  {}
);
assert.equal(blocked.ok, false);
assert.ok(blocked.reasons.includes("insufficient_verified_brand_facts"));
assert.ok(blocked.investigationReport?.includes("조사 리포트"));
assert.ok(typeof blocked.trustScore === "number");
assert.ok(Array.isArray(blocked.missingInformation));

assert.equal(MIN_VERIFIED_BRAND_FACTS, 3);

const fiveFacts = Array.from({ length: MIN_VERIFIED_BRAND_FACTS }, (_, i) => ({
  axis: "brand",
  fact: `라온커피 확인 사실 ${i + 1} — 네이버 플레이스 운영 정보`,
  source: "naver",
}));

const allowed = evaluateBrandJournalistWriteGate(
  baseInput,
  { facts: fiveFacts },
  {}
);
assert.equal(allowed.ok, true);
assert.equal(allowed.verifiedBrandFactCount, MIN_VERIFIED_BRAND_FACTS);

const writeGate = evaluateResearchWriteGate(
  baseInput,
  { facts: fiveFacts },
  { summary: "콜드브루 메뉴" }
);
assert.equal(writeGate.ok, true);

const writeBlocked = evaluateResearchWriteGate(
  baseInput,
  { facts: thinFacts },
  {}
);
assert.equal(writeBlocked.ok, false);

const userOnly = classifyFactVerification(
  { axis: "topic", fact: "오픈 — 사용자가 입력한 핵심 주제", source: "user_input" },
  baseInput
);
assert.equal(userOnly.verified, false);

const mission = buildBriclogMissionPromptBlock();
assert.ok(mission.includes("브랜드 기자이자 편집자"));
assert.ok(mission.includes("BRAND JOURNALIST DIRECTIVE"));

const prompt = buildBrandJournalistPromptBlock();
assert.ok(prompt.includes("검색결과를 문장으로 재조합하지 말 것"));

const report = buildBrandInvestigationReport(
  baseInput,
  { facts: fiveFacts },
  {}
);
assert.ok(report.readyForWrite);
assert.ok(report.investigationReport.includes("신뢰도 점수"));

const pack = {
  title: "라온커피 콜드브루",
  sections: [
    {
      heading: "소개",
      body:
        "라온커피 확인 사실 1 — 네이버 플레이스 운영 정보를 바탕으로 정리했어요. " +
        "라온커피 확인 사실 2 — 네이버 플레이스 운영 정보와 맞아요. " +
        "라온커피 확인 사실 3 — 네이버 플레이스 운영 정보를 참고했어요.",
    },
    { heading: "메뉴", body: "콜드브루는 산미가 적고 바디감이 있어요." },
    { heading: "정리", body: "판교에서 라온커피 콜드브루를 찾을 때 참고하세요." },
  ],
};

const inputWithLeads = {
  ...baseInput,
  researchFacts: fiveFacts,
  _webLeadsCache: {
    results: [
      {
        title: "라온커피 판교점 — 네이버 검색 결과 제목 그대로 복사",
        snippet: "이 스니펫 문장은 검색에서 가져온 원문입니다 절대 복사 금지",
      },
    ],
  },
};

const leakPack = {
  ...pack,
  sections: [
    {
      heading: "소개",
      body: "라온커피 판교점 — 네이버 검색 결과 제목 그대로 복사",
    },
    { heading: "본문", body: "내용" },
    { heading: "정리", body: "끝" },
  ],
};
const leak = detectSearchSnippetLeak(leakPack, inputWithLeads);
assert.equal(leak.ok, false);
assert.ok(leak.count >= 1);

const publishOk = assessNoNewFactsForPublish(
  pack,
  { ...baseInput, researchFacts: fiveFacts, brandInvestigationReport: report },
  report
);
assert.equal(publishOk.ok, true);

console.log("OK: brand journalist directive — 5-fact gate, investigation report, snippet leak");
