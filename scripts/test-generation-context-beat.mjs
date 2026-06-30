/**
 * 생성 직전 1비트 SSOT
 */
import assert from "node:assert/strict";
import {
  needsGenerationContextBeat,
  hasRichGenerationContext,
  resolveGenerationContextBeat,
  applyContextBeatToInput,
  mergeContextBeatText,
  toggleContextBeatChip,
  splitContextBeatParts,
} from "../lib/product/generationContextBeat.js";

process.env.BRICLOG_RESET_QUALITY = "true";

assert.equal(hasRichGenerationContext({ storeFeatures: "오션뷰·바비큐" }), false);
assert.equal(
  hasRichGenerationContext({ storeFeatures: "오션뷰 객실·바비큐장·7박 할인" }),
  true
);

const thin = {
  brandName: "애월바다펜션",
  region: "제주 애월",
  topic: "비수기 장박 할인, 직접 다녀왔어요",
  industry: "펜션",
};
assert.equal(needsGenerationContextBeat(thin), true);

const beat = resolveGenerationContextBeat(thin);
assert.ok(beat.chips.length >= 4);
assert.match(beat.headline, /숙소|포인트/);

const enriched = applyContextBeatToInput(thin, "오션뷰 · 바비큐 · 7박 할인");
assert.ok(enriched.storeFeatures.length >= 8);
assert.equal(hasRichGenerationContext(enriched), true);
assert.equal(needsGenerationContextBeat(enriched), false);

assert.equal(
  mergeContextBeatText("Alpha · Beta", "Beta · Gamma"),
  "Alpha · Beta · Gamma"
);

const chipA = "금성침대 — 대표 메뉴·서비스";
const chipB = "금성침대 — 가격·혜택";
let beatLine = toggleContextBeatChip("", chipA);
assert.equal(beatLine, chipA);
beatLine = toggleContextBeatChip(beatLine, chipB);
assert.equal(beatLine, `${chipA} · ${chipB}`);
beatLine = toggleContextBeatChip(beatLine, chipA);
assert.equal(beatLine, chipB);
assert.deepEqual(splitContextBeatParts(beatLine), [chipB]);

const furniture = resolveGenerationContextBeat({
  brandName: "금성침대",
  industry: "침대·매트리스",
  topic: "김포 가구단지 매트리스 추천",
});
assert.equal(furniture.industryKey, "furniture");

console.log("OK generation-context-beat");
