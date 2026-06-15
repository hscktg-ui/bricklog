import assert from "node:assert/strict";
import { PUBLIC_TEST_SAMPLES } from "../lib/publicTest/publicTestSamples.js";
import { tryInstantPublicTestSample } from "../lib/publicTest/runPublicBrandTest.js";
import {
  PUBLIC_TEST_CHANNEL_HEADLINE,
  PUBLIC_TEST_BLUR_HINT,
} from "../lib/publicTest/publicTestConfig.js";

const sample = PUBLIC_TEST_SAMPLES[0];
const result = tryInstantPublicTestSample({
  brandName: sample.brandName,
  region: sample.region,
  topic: sample.topic,
  sampleId: sample.id,
});

assert.ok(result?.ok, "instant sample should pass");
assert.ok(result.metrics?.contextScore?.speakerTone?.displayLine, "speakerTone line");
assert.ok(result.metrics?.reflectionChips?.length >= 2, "reflection chips");
assert.ok(result.preview?.place || result.preview?.insta, "multi-channel preview");
if (result.metrics.contextScore.sqvDiagnostic) {
  assert.equal(typeof result.metrics.contextScore.sqvDiagnostic.label, "string");
}

const topicChip = result.metrics.reflectionChips.find((c) => c.id === "topic");
assert.ok(topicChip, "topic chip expected");

assert.ok(PUBLIC_TEST_CHANNEL_HEADLINE.includes("세 채널"));
assert.ok(PUBLIC_TEST_BLUR_HINT.includes("가입"));

console.log("test-public-test-reflection-display: ok");
