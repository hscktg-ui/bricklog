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
import { runPublicBrandTest } from "@/lib/publicTest/runPublicBrandTest.js";

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
}

const editedTopic = findMatchingPublicTestSample({
  brandName: PUBLIC_TEST_SAMPLES[0].brandName,
  region: PUBLIC_TEST_SAMPLES[0].region,
  topic: "봄 시즌 브런치 예약 안내",
  sampleId: PUBLIC_TEST_SAMPLES[0].id,
});
assert.equal(editedTopic?.id, PUBLIC_TEST_SAMPLES[0].id);
assert.equal(editedTopic?.topic, "봄 시즌 브런치 예약 안내");

const instant = await runPublicBrandTest({
  ...PUBLIC_TEST_SAMPLES[0],
  sampleId: PUBLIC_TEST_SAMPLES[0].id,
});
assert.equal(instant.ok, true, instant.userMessage);
assert.equal(instant.instant, true);
assert.ok(instant.preview?.title);
assert.ok(instant.preview?.intro);

console.log("OK public test instant samples", PUBLIC_TEST_SAMPLES.length);
