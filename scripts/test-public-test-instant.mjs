/**
 * 가상 브랜드 예시 — 즉시 샘플 회귀
 */
import assert from "node:assert/strict";
import { PUBLIC_TEST_SAMPLES } from "@/lib/publicTest/publicTestSamples.js";
import {
  buildInstantPublicTestPack,
  findMatchingPublicTestSample,
} from "@/lib/publicTest/publicTestInstantSample.js";
import { assertPublicTestSampleGate } from "@/lib/publicTest/publicTestGate.js";
import { prepareBriclogPreWriteContext } from "@/lib/content/briclogPreWriteContext.js";
import { runPublicBrandTest, tryDynamicPublicTestInstant } from "@/lib/publicTest/runPublicBrandTest.js";
import { pickPublicTestTemplateForInput } from "@/lib/publicTest/pickPublicTestTemplate.js";

process.env.BRICLOG_MISSION = "true";

for (const sample of PUBLIC_TEST_SAMPLES) {
  const matched = findMatchingPublicTestSample({
    ...sample,
    sampleId: sample.id,
  });
  assert.equal(matched?.id, sample.id, sample.id);

  const preWrite = prepareBriclogPreWriteContext({
    ...sample,
    mainKeyword: sample.topic,
    publicTestMode: true,
  });
  const input = {
    ...sample,
    mainKeyword: sample.topic,
    ...preWrite,
    contextLock: preWrite.contextLock,
    publicTestMode: true,
  };
  const pack = buildInstantPublicTestPack(sample);
  const gate = assertPublicTestSampleGate(input, pack);
  assert.equal(gate.ok, true, `${sample.id}: ${gate.reasons?.join(", ")}`);
  assert.ok(pack._meta.charCount >= 400, sample.id);
  assert.ok(pack.place?.detailBody, `${sample.id}: place`);
  assert.ok(
    pack.instagram?.lineBreakBody || pack.instagram?.body,
    `${sample.id}: insta`
  );
  assert.ok(pack._meta.hasPlace, sample.id);
  assert.ok(pack._meta.hasInsta, sample.id);
}

const editedTopic = findMatchingPublicTestSample({
  brandName: PUBLIC_TEST_SAMPLES[0].brandName,
  region: PUBLIC_TEST_SAMPLES[0].region,
  topic: "봄 시즌 브런치 예약 안내",
  sampleId: PUBLIC_TEST_SAMPLES[0].id,
});
assert.equal(editedTopic?.id, PUBLIC_TEST_SAMPLES[0].id);
assert.equal(editedTopic?.topic, "봄 시즌 브런치 예약 안내");

const cafePack = buildInstantPublicTestPack(PUBLIC_TEST_SAMPLES[0]);
const cafeText = cafePack.sections.map((s) => s.body).join("\n");
assert.equal(cafePack._meta.generationMode, "engine_featured_sample");
assert.equal(cafePack._meta.featuredSeedId, "cafe_rainy_brunch");
assert.ok(/로스팅|창가/.test(cafeText), "cafe uses engine featured blog");
assert.ok(!/안내를 제공하는 카페/.test(cafeText), "no template cafe copy");
assert.ok(cafePack.place?.detailBody, "cafe engine place");
assert.ok(/순차 오픈|콘센트/.test(cafePack.place.detailBody), "cafe featured place");
assert.ok(!/복합 문화공간/.test(cafePack.place.detailBody), "no place panel rewrite");
const cafeInsta = cafePack.instagram?.lineBreakBody || cafePack.instagram?.body || "";
assert.ok(cafeInsta, "cafe engine insta");
assert.ok(/더운 오후|아이스 브런치/.test(cafeInsta), "cafe featured insta");
assert.ok(!/마음에 드는 날/.test(cafeInsta), "no insta panel rewrite");

const instant = await runPublicBrandTest({
  ...PUBLIC_TEST_SAMPLES[0],
  sampleId: PUBLIC_TEST_SAMPLES[0].id,
});
assert.equal(instant.ok, true, instant.userMessage);
assert.equal(instant.instant, true);
assert.ok(instant.preview?.title);
assert.ok(instant.preview?.intro);
assert.ok(/로스팅|창가/.test(instant.preview.intro), "preview is featured blog");
assert.ok(instant.preview?.place?.short, "place preview");
assert.ok(instant.preview?.insta?.body, "insta preview");
assert.equal(instant.metrics?.contextScore?.channels?.find((c) => c.id === "place")?.ready, true);
assert.equal(instant.metrics?.contextScore?.channels?.find((c) => c.id === "insta")?.ready, true);

const template = pickPublicTestTemplateForInput({
  brandName: "블루포트 카페",
  region: "부산 해운대",
  topic: "여름 시즌 수박 스무디·에이드 신메뉴",
});
assert.equal(template?.id, "cafe_brunch");
assert.equal(template?.brandName, "블루포트 카페");

const dynamic = tryDynamicPublicTestInstant({
  brandName: "레이어드살롱",
  region: "서울 홍대",
  topic: "5월 컬러 이벤트 예약 안내·두피 케어 패키지",
});
assert.equal(dynamic?.ok, true, dynamic?.userMessage);
assert.equal(dynamic?.demoFallback, true);
assert.equal(dynamic?.templateId, "salon_care");
assert.ok(dynamic.preview?.place?.short, "dynamic place");
assert.ok(dynamic.preview?.insta?.body, "dynamic insta");
assert.ok(dynamic.preview?.intro?.includes("레이어드살롱"), "brand in dynamic intro");
assert.ok(!dynamic.preview.intro.includes("루트앤컷"), "adapted off catalog brand");

const quotaBypass = tryDynamicPublicTestInstant({
  brandName: "테스트베이커",
  region: "대전 유성",
  topic: "크루아상 오픈 당일 픽업",
});
assert.equal(quotaBypass?.demoFallback, true);
assert.equal(quotaBypass?.templateId, "bakery_open");

console.log("OK public test instant samples", PUBLIC_TEST_SAMPLES.length);
