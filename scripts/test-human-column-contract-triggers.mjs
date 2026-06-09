/**
 * Human column contract + writer engine pass triggers
 */
import assert from "node:assert/strict";
import {
  isHumanTierMet,
  isHumanColumnContractMet,
  needsWriterEnginePass,
  buildHumanColumnRegenNote,
} from "../lib/product/humanTierRegen.js";
import { assessHumanColumnContract } from "../lib/product/humanColumnContract.js";

const input = { blogLengthTier: "short", brandName: "테스트", region: "서울", topic: "브런치" };

const shortPack = {
  title: "테스트",
  sections: [
    { heading: "a", body: "짧은 본문." },
    { heading: "b", body: "또 짧음." },
    { heading: "c", body: "마무리." },
  ],
};

assert.equal(isHumanTierMet(shortPack, input), false);
assert.equal(isHumanColumnContractMet(shortPack, input), false);
assert.equal(needsWriterEnginePass(shortPack, input), true);

const note = buildHumanColumnRegenNote(shortPack, input);
assert.ok(note.includes("칼럼 계약"), note);
assert.ok(note.includes("분량"), note);

const contract = assessHumanColumnContract(shortPack, input);
assert.ok(contract.reasons.includes("length_tier_under"));

console.log("OK: human-column-contract-triggers", {
  reasons: contract.reasons.slice(0, 4),
});
