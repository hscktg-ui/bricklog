/**
 * 랜딩 샘플 — 블로그·플레이스·인스타가 엔진 featured 경로인지
 */
import assert from "node:assert/strict";
import { ALL_FEATURED_SAMPLE_SEEDS } from "@/lib/landing/featuredSeedCatalog.js";
import { LANDING_SAMPLE_SETS } from "@/lib/landing/sampleContent.js";
import { PUBLIC_TEST_SAMPLES } from "@/lib/publicTest/publicTestSamples.js";
import { buildInstantPublicTestPack } from "@/lib/publicTest/publicTestInstantSample.js";

process.env.BRICLOG_MISSION = "true";

assert.equal(LANDING_SAMPLE_SETS.length, ALL_FEATURED_SAMPLE_SEEDS.length);

for (const sample of LANDING_SAMPLE_SETS) {
  assert.ok(sample.blog?.title, `${sample.id}: blog title`);
  assert.ok(sample.blog?.sections?.length >= 2, `${sample.id}: blog sections`);
  assert.ok(sample.place?.short, `${sample.id}: place short`);
  assert.ok(sample.place?.detail, `${sample.id}: place detail`);
  assert.ok(sample.insta?.body, `${sample.id}: insta`);
  assert.ok(sample.place.charCount >= 40, `${sample.id}: place length`);
  assert.ok(sample.insta.charCount >= 40, `${sample.id}: insta length`);
}

const cafe = LANDING_SAMPLE_SETS.find((s) => s.id === "cafe_rainy_brunch");
assert.ok(cafe);
assert.ok(/로스팅|창가/.test(cafe.blog.body), "landing cafe blog is featured");
assert.ok(cafe.place.detail.length > 40, "landing cafe place from engine");
assert.ok(cafe.insta.body.length > 40, "landing cafe insta from engine");

for (const sample of PUBLIC_TEST_SAMPLES) {
  const pack = buildInstantPublicTestPack(sample);
  assert.equal(
    pack._meta.generationMode,
    "engine_featured_sample",
    `${sample.id}: engine featured`
  );
  assert.ok(pack.place?.detailBody, `${sample.id}: place`);
  assert.ok(
    pack.instagram?.lineBreakBody || pack.instagram?.body,
    `${sample.id}: insta`
  );
}

console.log("OK: landing + public-test engine samples", {
  landing: LANDING_SAMPLE_SETS.length,
  publicTest: PUBLIC_TEST_SAMPLES.length,
});
