import {
  getDefaultPublicTestSample,
  PUBLIC_TEST_SAMPLES,
  PUBLIC_TEST_SAMPLE_COUNT,
} from "@/lib/publicTest/publicTestSamples";

export { PUBLIC_TEST_SAMPLES, PUBLIC_TEST_SAMPLE_COUNT };

/** 가입 전 브랜드 테스트 — SSOT */

export const PUBLIC_TEST_DAILY_LIMIT = 3;
export const PUBLIC_TEST_SLA_MS = 15_000;
export const PUBLIC_TEST_PREVIEW_RATIO = 0.35;
export const PUBLIC_TEST_MIN_INFO_UNITS = 5;
export const PUBLIC_TEST_MIN_RELEVANCE = 0.8;

/** @deprecated — getDefaultPublicTestSample() 또는 PUBLIC_TEST_SAMPLES 사용 */
export const PUBLIC_TEST_PLACEHOLDERS = (() => {
  const s = getDefaultPublicTestSample();
  return {
    brandName: s.brandName,
    region: s.region,
    topic: s.topic,
  };
})();

export const PUBLIC_TEST_QUOTA_EXCEEDED =
  "오늘의 무료 테스트를 모두 사용했습니다. 브랜드 작업실을 만들면 계속 사용할 수 있습니다.";

export const PUBLIC_TEST_GATE_FAIL =
  "입력을 조금만 구체적으로 적어 주세요. 브랜드 · 지역 · 주제가 분명할수록 발행 가능한 샘플이 나옵니다.";

export const PUBLIC_TEST_BLUR_HINT =
  "전체 콘텐츠와 브랜드 기록 저장은 가입 후 확인할 수 있습니다.";

export const PUBLIC_TEST_TIME_HINT =
  "보통 30~60초 안에 발행 가능 샘플을 확인할 수 있습니다.";

export const PUBLIC_TEST_GATE_RETRY_HINT =
  "브랜드 특징 한 줄(예: 수제 브런치·어버이날 픽업)을 주제에 넣으면 샘플 품질이 올라갑니다.";

export const PUBLIC_TEST_SAMPLE_BADGE = "가상 브랜드 예시";
