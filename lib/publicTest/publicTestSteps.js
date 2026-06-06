/** 고객용 진행 문구 — 기술·에러 노출 금지 */
import { PUBLIC_TEST_SLA_MS } from "@/lib/publicTest/publicTestConfig";

export const PUBLIC_TEST_LOADING_STEPS = [
  "브랜드 맥락을 정리하고 있습니다.",
  "관련 정보를 조사하고 있습니다.",
  "발행 가능한 샘플을 작성하고 있습니다.",
];

export const PUBLIC_TEST_LOADING_SLOW =
  "조사 중입니다. 브랜드 정보를 정리하고 있습니다.";

export function pickPublicTestStep(elapsedMs) {
  if (elapsedMs < 4000) return PUBLIC_TEST_LOADING_STEPS[0];
  if (elapsedMs < 9000) return PUBLIC_TEST_LOADING_STEPS[1];
  if (elapsedMs < PUBLIC_TEST_SLA_MS) return PUBLIC_TEST_LOADING_STEPS[2];
  return PUBLIC_TEST_LOADING_SLOW;
}
