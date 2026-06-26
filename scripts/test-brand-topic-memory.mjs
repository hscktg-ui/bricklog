/**
 * 브랜드 주제 해석·학습 — 회귀
 * Run: npm run test:brand-topic-memory
 */
import assert from "node:assert/strict";
import {
  interpretBrandTopic,
  applyBrandTopicInterpretation,
  mergeTopicMemoryEntries,
  buildTopicMemoryEntry,
} from "../lib/memory/brandTopicMemory.js";

const yeojuInput = {
  brandName: "여주목마",
  region: "여주",
  industry: "레저/체험",
  topic: "여주목마 여름시즌 오픈 소식, 직접 둘러보고 정리해 봤습니다",
  researchFacts: [
    { fact: "실외 수영장·물놀이 시즌 오픈", source: "research" },
  ],
};

const interp = interpretBrandTopic(yeojuInput);
assert.equal(interp.sentenceLikeTopic, true, "문장형 주제 감지");
assert.ok(interp.topicVerbatimForbidden.length >= 1, "원문 verbatim 금지");
assert.notEqual(interp.topicWritingSubject, yeojuInput.topic, "글감은 축약");
assert.match(interp.topicBriefForLlm, /조사|시설|그대로 복사 금지/);

const applied = applyBrandTopicInterpretation(yeojuInput);
assert.notEqual(applied.topic, yeojuInput.topic, "topic 필드는 글감으로");
assert.equal(applied.topicDisplayRaw, yeojuInput.topic, "원문 보존");

const learned = mergeTopicMemoryEntries([], buildTopicMemoryEntry(applied, "success"));
assert.equal(learned.length, 1);
const again = mergeTopicMemoryEntries(learned, buildTopicMemoryEntry(applied, "success"));
assert.equal(again.length, 1);
assert.equal(again[0].successCount, 2);

const withMemory = interpretBrandTopic({
  ...yeojuInput,
  topicMemoryLearned: learned,
});
assert.equal(withMemory.learnedMatch, true, "학습 매칭");

console.log("OK brand-topic-memory");
