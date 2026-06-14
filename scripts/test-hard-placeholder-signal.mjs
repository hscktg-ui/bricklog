/**
 * Hard placeholder signal — soft bare_utilize vs hard template tokens
 */
import assert from "node:assert/strict";
import { hasHardPlaceholderSignal } from "../lib/quality/hardPlaceholderSignal.js";
import { hasTemplatePlaceholder } from "../lib/quality/placeholderGuard.js";

assert.equal(
  hasHardPlaceholderSignal("undefined 브랜드 소개"),
  true,
  "literal undefined is hard"
);
assert.equal(
  hasHardPlaceholderSignal("좋은내용으로 정리했습니다"),
  true,
  "good_content typo is hard"
);
assert.equal(
  hasHardPlaceholderSignal(
    "방문 전 이용 기준을 확인하고, 이용 방법과 이용 시 주의할 점을 정리했습니다."
  ),
  false,
  "bare utilize contamination is soft for publishReady training"
);
assert.equal(
  hasHardPlaceholderSignal("현장에서 확인한 내용을 바탕으로 정리했습니다."),
  false,
  "normal 내용을 prose is not a template label"
);
assert.equal(hasTemplatePlaceholder("내용: 입력해 주세요"), true, "field label still hard");

console.log("test-hard-placeholder-signal: PASS");
