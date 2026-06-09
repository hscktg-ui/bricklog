/**
 * 관리자 실패글 + 운영 금칙어 감지 regression
 */
import assert from "node:assert/strict";
import { detectFailureArticlePatterns } from "../lib/golden/goldenFailureDetection.js";
import { GOLDEN_FAILURE_SAMPLES } from "../lib/golden/goldenFailureSeed.js";

const FLOWER = { industry: "꽃집", goldenSamples: [] };

const placeholder = detectFailureArticlePatterns(GOLDEN_FAILURE_SAMPLES[0].content, FLOWER);
assert.ok(placeholder.criticalFail, "seed placeholder critical");

const adminFailure = {
  goldenSamples: [
    {
      id: "admin-fail-1",
      industry: "flower_shop",
      sample_kind: "failure",
      fail_reason: "custom_spam",
      title: "커스텀 실패",
      content:
        "브릭로그 테스트 실패문장 알파벳없이 한글만 반복 테스트실패문장 패턴입니다. 테스트실패문장 동일표현.",
    },
  ],
};

const custom = detectFailureArticlePatterns(
  "브릭로그 테스트 실패문장 알파벳없이 한글만 반복 테스트실패문장 패턴입니다. 테스트실패문장 동일표현.",
  { industry: "꽃집", ...adminFailure }
);
assert.ok(
  custom.hits.some((h) => h.startsWith("failure_")),
  `admin failure should hit got ${custom.hits}`
);

const override = detectFailureArticlePatterns("이 문장에 커스텀금칙테스트 단어가 있습니다.", {
  industry: "꽃집",
  _haeshinDnaOverrides: { forbiddenGlobal: ["커스텀금칙테스트"] },
});
assert.ok(override.placeholderHits >= 1);

console.log("OK: failure-pattern-detection");
