/** 고객용 진행 문구 — 기술·에러 노출 금지 */
import { PUBLIC_TEST_LOADING_MESSAGE } from "@/lib/publicTest/publicTestConfig";

export const PUBLIC_TEST_LOADING_STEPS = [PUBLIC_TEST_LOADING_MESSAGE];

export function pickPublicTestStep() {
  return PUBLIC_TEST_LOADING_MESSAGE;
}
