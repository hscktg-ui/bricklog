/**
 * Phase 1 UI — 로딩 라벨·카피 SSOT
 */
import assert from "node:assert/strict";
import {
  CUSTOMER_PIPELINE_STEP_LABELS,
  mapCustomerPipelineStepLabel,
} from "@/lib/product/customerOutput.js";
import { REFINE_COPY, RESULT_VIEW, WELCOME } from "@/lib/product/craft.js";

assert.equal(
  mapCustomerPipelineStepLabel("브랜드 분석 중…"),
  CUSTOMER_PIPELINE_STEP_LABELS.research
);
assert.equal(
  mapCustomerPipelineStepLabel("주제 정보 단위 분해 중…"),
  CUSTOMER_PIPELINE_STEP_LABELS.research
);
assert.equal(
  mapCustomerPipelineStepLabel("콘텐츠 작성 중…"),
  CUSTOMER_PIPELINE_STEP_LABELS.write
);
assert.equal(
  mapCustomerPipelineStepLabel("최종 검수 중…"),
  CUSTOMER_PIPELINE_STEP_LABELS.review
);
assert.ok(!mapCustomerPipelineStepLabel("정보 단위 분해")?.includes("단위"));
assert.equal(RESULT_VIEW.sectionLabel, "발행용 원고");
assert.equal(RESULT_VIEW.copyBlockTitle, "오늘의 원고");
assert.ok(REFINE_COPY.blog.includes("다듬"));
assert.ok(WELCOME.situationHint.includes("상황"));

console.log("OK: customer UI phase 1 copy");
