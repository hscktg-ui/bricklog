/**
 * Brand log topic engine regression
 */
import assert from "node:assert/strict";
import {
  parseBrandLogSignals,
  buildBrandLogTopicCandidates,
  buildBrandLogTopicPack,
  mergeBrandLogIntoInput,
} from "../lib/memory/brandLogTopicEngine.js";

const BRAND = {
  brandName: "품질감사카페",
  region: "서울 강남",
  industry: "카페",
  storeFeatures: "수제 브런치·로스팅 원두·창가 좌석",
  includePhrases: "봄 시즌 메뉴, 예약 안내",
};

const signals = parseBrandLogSignals(BRAND);
assert.ok(signals.length >= 3, "expected brand log signals");
assert.ok(signals.some((s) => s.phrase.includes("브런치")), "brunch signal");

const recent = ["서울 강남 품질감사카페, 봄 시즌 브런치 메뉴 오픈"];
const candidates = buildBrandLogTopicCandidates({
  ...BRAND,
  recentTopics: recent,
});
assert.ok(candidates.length >= 2, "expected topic candidates");
assert.ok(
  !candidates.some((c) => c.topic.includes("봄 시즌 브런치 메뉴 오픈")),
  "should skip overlap with recent"
);

const pack = buildBrandLogTopicPack({ ...BRAND, recentTopics: recent });
assert.ok(pack.chips.length >= 2, "chips");
assert.ok(pack.today.length >= 1, "today");

const merged = mergeBrandLogIntoInput(
  { topic: "신메뉴" },
  { ...BRAND, id: "b1", brandDescription: "로스팅 전문" }
);
assert.equal(merged.brandName, "품질감사카페");
assert.ok(merged.storeFeatures.includes("브런치"));
assert.equal(merged.brandId, "b1");

console.log("OK: brand-log-topics", {
  signals: signals.length,
  candidates: candidates.length,
  chip: pack.chips[0],
});
