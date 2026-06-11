/**
 * GPT-5.5 LLM 원고 — Mission 카탈로그 결말·패딩 차단
 */
import assert from "node:assert/strict";
import {
  buildMissionConclusionLine,
  shouldSkipMissionCatalogConclusion,
} from "@/lib/product/missionProseEngine.js";
import { shouldPreserveGpt55LlmPackBody } from "@/lib/product/gpt55LlmPackGuard.js";
import { shouldSuppressLengthTopoff } from "@/lib/product/coreContentEngine.js";
import { applyHumanColumnPolish } from "@/lib/content/humanColumnPolishEngine.js";
import { applyEditorialPackGate } from "@/lib/content/editorialPackGate.js";
import { ensureEditorDeliveryStructure } from "@/lib/content/editorQualityEngine.js";
import { polishLlmPackForDelivery } from "@/lib/golden/llmDeliveryPolish.js";

const prevDominant = process.env.BRICLOG_GPT55_DOMINANT;
const prevKey = process.env.OPENAI_API_KEY;
process.env.BRICLOG_GPT55_DOMINANT = "true";
process.env.OPENAI_API_KEY = "sk-test-key-for-gpt55-catalog-block-0123456789";

const furnitureInput = {
  brandName: "에이스침대",
  region: "경기도 용인",
  topic: "스트레스리스",
  industry: "가구",
  storeFeatures: "프랜차이즈 쇼룸, 스트레스리스 체어 전시",
};

const llmPack = {
  title: "경기도 용인 에이스침대 스트레스리스",
  sections: [
    {
      heading: "쇼룸 체험",
      body: "스트레스리스 체어에 앉아 좌판 깊이와 등받이 각도를 비교해 봤어요.",
    },
    {
      heading: "모델 구성",
      body: "지점마다 전시 모델이 달라 사전 문의가 필요했어요.",
    },
    {
      heading: "정리",
      body: "식탁 높이에 맞춰 앉아 본 뒤 고르는 편이 좋았어요.",
    },
  ],
  conclusion: "체험 후 본인 기준으로 정리해 봤어요.",
  _meta: { llmGenerated: true, generationMode: "llm_gpt55" },
};

assert.ok(shouldPreserveGpt55LlmPackBody(llmPack, furnitureInput));
assert.ok(shouldSkipMissionCatalogConclusion(llmPack, furnitureInput));
assert.ok(shouldSuppressLengthTopoff(llmPack, furnitureInput));

const catalogLine = buildMissionConclusionLine(
  { regionBit: "경기도 용인 ", brand: "에이스침대", topicFacet: "스트레스리스" },
  furnitureInput,
  "스트레스리스",
  llmPack
);
assert.equal(catalogLine, "", "catalog conclusion blocked for gpt55 llm pack");

const polished = polishLlmPackForDelivery(llmPack, furnitureInput);
assert.ok(polished._meta?.gpt55LlmPolishPreserved);
assert.ok(!polished._meta?.llmDnaAnchors, "dna anchor padding skipped");
const polishedText = polished.sections.map((s) => s.body).join("\n");
assert.ok(!/선택이\s*수월/.test(polishedText));

const columnPolished = applyHumanColumnPolish(llmPack, furnitureInput);
assert.equal(columnPolished.sections[0].heading, llmPack.sections[0].heading);

const editorial = applyEditorialPackGate(llmPack, { input: furnitureInput });
assert.equal(editorial.sections.length, llmPack.sections.length);

const structured = ensureEditorDeliveryStructure(
  { ...llmPack, conclusion: "" },
  furnitureInput
);
assert.ok(!/좌판·등받이·팔걸이/.test(structured.conclusion || ""));
assert.ok(!/프랜차이즈\s*쇼룸/.test(structured.conclusion || ""));

if (prevDominant === undefined) delete process.env.BRICLOG_GPT55_DOMINANT;
else process.env.BRICLOG_GPT55_DOMINANT = prevDominant;
if (prevKey === undefined) delete process.env.OPENAI_API_KEY;
else process.env.OPENAI_API_KEY = prevKey;

console.log("OK: gpt55 llm catalog block — conclusion, polish, column, editorial, editor structure");
