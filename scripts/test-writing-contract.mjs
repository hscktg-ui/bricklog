/**
 * writingContract SSOT — 제품 소개 vs 방문 후기 라우팅 회귀
 * Run: npm run test:writing-contract
 */
import assert from "node:assert/strict";
import { recommendContentPersona } from "../lib/persona/contentPersona.js";
import { detectContentIntent } from "../lib/pipeline/v2/intentDetection.js";
import {
  resolveWritingContract,
  isExplicitVisitReviewInput,
  resolveBriclogSectionBlueprint,
} from "../lib/content/writingContract.js";
import { buildMissionExperienceCatalog } from "../lib/product/missionProseEngine.js";
import { deriveTopicWritingContext } from "../lib/content/topicFacetEngine.js";

const VISIT_MISSION_RE =
  /직접\s*(?:가|다녀|봤)|매장\s*문을\s*열고|진열대|비교해\s*봤|들었어요|상담\s*초반/;

function contractFor(input) {
  const c = resolveWritingContract(input);
  const persona = recommendContentPersona(input);
  const intent = detectContentIntent({
    topic: input.topic,
    brandName: input.brandName,
    region: input.region,
    industry: input.industry,
  });
  return { contract: c, persona, intent: intent.locked };
}

// 1) 브릭로그 자사 — 제품 소개 (직원 피드백 케이스)
{
  const input = {
    brandName: "브릭로그",
    topic: "브릭로그 작업실과 채널별 초안 기능 소개",
    industry: "SaaS",
  };
  const { contract, persona, intent } = contractFor(input);
  assert.equal(contract.type, "product_guide", "briclog product");
  assert.equal(contract.density, "segmented");
  assert.equal(contract.visitToneAllowed, false);
  assert.equal(persona.persona, "info_intro");
  assert.equal(intent, "product_intro");
  assert.equal(resolveBriclogSectionBlueprint(input, contract), "product");
}

// 2) 브릭로그 — 철학 글은 별도
{
  const input = {
    brandName: "브릭로그",
    topic: "브릭로그가 지향하는 Brand Content OS 철학",
  };
  const contract = resolveWritingContract(input);
  assert.equal(contract.type, "brand_philosophy");
  assert.equal(resolveBriclogSectionBlueprint(input, contract), "philosophy");
}

// 3) 꽃집 정보형 — visit 아님 (기존 flower 테스트)
{
  const input = {
    brandName: "그랩앤고플라워",
    region: "평택",
    topic: "여름에 사야할 꽃 소개",
    industry: "꽃집",
  };
  const { contract, persona, intent } = contractFor(input);
  assert.equal(contract.visitToneAllowed, false);
  assert.equal(persona.persona, "info_intro");
  assert.equal(intent, "guide");
}

// 4) 가구 쇼룸 — 체험만으로 visit 금지
{
  const input = {
    brandName: "모던침대",
    region: "파주",
    topic: "스트레스리스 소파 라인업 비교",
    industry: "가구",
    includePhrases: "매트리스 체험존",
  };
  assert.equal(isExplicitVisitReviewInput(input), false);
  const { contract, persona } = contractFor(input);
  assert.equal(contract.type, "info_compare");
  assert.notEqual(persona.persona, "visit_review");
}

// 5) 명시 방문 후기만 visit
{
  const input = {
    brandName: "로컬카페",
    region: "홍대",
    topic: "홍대 브런치 카페 방문 후기",
    industry: "카페",
  };
  assert.equal(isExplicitVisitReviewInput(input), true);
  const { contract, persona } = contractFor(input);
  assert.equal(contract.type, "visit_review");
  assert.equal(persona.persona, "visit_review");
}

// 6) 카페 시즌 메뉴 — 정보형 (로컬 업종 visit 기본값 override)
{
  const input = {
    brandName: "동네카페",
    region: "일산",
    topic: "봄 시즌 디저트 메뉴 소개",
    industry: "카페",
  };
  const { contract } = contractFor(input);
  assert.equal(contract.visitToneAllowed, false);
  assert.match(contract.type, /product_guide|info/);
}

// 7) 꽃집 정보형 — 미션 카탈로그 visit 금지
{
  const input = {
    brandName: "그랩앤고플라워",
    region: "평택",
    topic: "여름에 사야할 꽃 소개",
    industry: "꽃집",
  };
  const p = deriveTopicWritingContext(input);
  const catalog = buildMissionExperienceCatalog(p, input, []);
  assert.ok(catalog.length >= 2, "mission catalog");
  assert.equal(VISIT_MISSION_RE.test(catalog.join(" ")), false, catalog.slice(0, 2).join(" | "));
}

// 8) 브릭로그 제품 소개 — SaaS형 미션 패드
{
  const input = {
    brandName: "브릭로그",
    topic: "작업실과 채널별 초안 기능",
    industry: "SaaS",
  };
  const p = deriveTopicWritingContext(input);
  const catalog = buildMissionExperienceCatalog(p, input, []);
  const joined = catalog.join(" ");
  assert.match(joined, /작업실|채널|조사/);
  assert.equal(VISIT_MISSION_RE.test(joined), false);
}

console.log("OK writing-contract (8 cases)");
