/**
 * Brand Wiki v2 — 구조·주제 설명 가능·검증 팩트
 */
import assert from "node:assert/strict";
import {
  buildBrandWiki,
  formatBrandWikiBrief,
  assessBrandWikiReadiness,
  WIKI_SECTIONS,
} from "../lib/evolution/brandWikiEngine.js";

const ACE = {
  brandName: "에이스침대",
  region: "파주",
  topic: "루체3 전시소식",
  mainKeyword: "루체3 전시소식",
  industry: "가구/침대",
  researchFacts: [
    { axis: "topic", fact: "파주 매장 루체3 전시 라인업 체험 가능", source: "research" },
    { axis: "brand", fact: "에이스침대 파주점 전시 기간·대상 모델 안내", source: "official" },
    { axis: "topic", fact: "루체3 프레임·매트리스 조합별 체험 동선", source: "naver" },
  ],
};

const wiki = buildBrandWiki(ACE);
assert.equal(wiki.version, "v2");
assert.ok(wiki.sections.topic.length >= 3, "topic section");
assert.ok(wiki.sections.facts.length >= 2, "facts section");
assert.equal(wiki.entryCount, wiki.count);
assert.ok(wiki.verifiedFactCount >= 1, "verified facts");

const brief = formatBrandWikiBrief(wiki);
assert.ok(brief.includes("【브랜드 위키"));
assert.ok(brief.includes("루체3"));
assert.ok(!brief.includes("지역 연관 검색"));

const readiness = assessBrandWikiReadiness(ACE);
assert.ok(Array.isArray(readiness.reasons));
assert.equal(readiness.entryCount, wiki.entryCount);

const thin = {
  brandName: "테스트",
  region: "서울",
  topic: "소개",
  researchFacts: [{ fact: "짧음", source: "research" }],
};
const thinWiki = assessBrandWikiReadiness(thin);
assert.equal(thinWiki.ok, false);
assert.ok(thinWiki.reasons.length > 0);

assert.ok(WIKI_SECTIONS.profile.label);
console.log("OK: brand wiki v2 structure");
console.log("  sections:", Object.keys(wiki.sections).filter((k) => wiki.sections[k]?.length));
console.log("  topicExplainable:", wiki.topicExplainable);
console.log("  verifiedFacts:", wiki.verifiedFactCount);
