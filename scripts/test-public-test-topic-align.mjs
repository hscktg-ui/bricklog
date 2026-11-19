/**
 * Flagship public-test: season/topic mismatch must not serve summer featured pack.
 * Run: node --import ./scripts/register-alias.mjs scripts/test-public-test-topic-align.mjs
 */
import assert from "node:assert/strict";
import {
  inferSeasonFromText,
  seasonsCompatible,
} from "../lib/landing/seasonTheme.js";
import {
  findMatchingPublicTestSample,
  buildInstantPublicTestPack,
  topicsAlignForInstant,
} from "../lib/publicTest/publicTestInstantSample.js";
import { tryInstantPublicTestSample } from "../lib/publicTest/runPublicBrandTest.js";

assert.equal(inferSeasonFromText("봄 시즌 브런치"), "spring");
assert.equal(inferSeasonFromText("여름 휴가철 아이스"), "summer");
assert.equal(inferSeasonFromText("늦가을 시즌 브런치"), "autumn");
assert.equal(seasonsCompatible("봄 시즌", "여름 아이스"), false);
assert.equal(topicsAlignForInstant("봄 시즌 브런치", "늦가을 시즌 브런치·따뜻한 시즌 음료"), false);

const mismatched = findMatchingPublicTestSample({
  brandName: "모카하우스",
  region: "서울 마포",
  topic: "봄 시즌 브런치",
});
assert.equal(mismatched, null, "custom spring topic should skip instant demo match");

const instant = tryInstantPublicTestSample({
  brandName: "모카하우스",
  region: "서울 마포",
  topic: "봄 시즌 브런치",
});
assert.equal(instant, null, "instant path must not return season-mismatched pack");

const aligned = findMatchingPublicTestSample({
  brandName: "모카하우스",
  region: "서울 마포",
  topic: "늦가을 시즌 브런치·따뜻한 시즌 음료",
});
assert.ok(aligned, "aligned topic should match demo sample");
const pack = buildInstantPublicTestPack(aligned);
assert.ok(pack?.title, "aligned pack has title");
assert.equal(/더운 날|아이스 브런치|여름/.test(pack.title + JSON.stringify(pack.sections)), false);

console.log("ok: public-test topic/season align");
