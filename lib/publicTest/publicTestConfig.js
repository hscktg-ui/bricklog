/** 가입 전 브랜드 테스트 — SSOT */

export const PUBLIC_TEST_DAILY_LIMIT = 3;
export const PUBLIC_TEST_SLA_MS = 15_000;
export const PUBLIC_TEST_PREVIEW_RATIO = 0.35;
export const PUBLIC_TEST_MIN_INFO_UNITS = 5;
export const PUBLIC_TEST_MIN_RELEVANCE = 0.8;

export const PUBLIC_TEST_PLACEHOLDERS = {
  brandName: "해신기획",
  region: "파주",
  topic: "블로그 마케팅",
};

export const PUBLIC_TEST_QUOTA_EXCEEDED =
  "오늘의 무료 테스트를 모두 사용했습니다. 브랜드 작업실을 만들면 계속 사용할 수 있습니다.";

export const PUBLIC_TEST_GATE_FAIL =
  "입력을 조금만 구체적으로 적어 주세요. 브랜드 · 지역 · 주제가 분명할수록 발행 가능한 샘플이 나옵니다.";

export const PUBLIC_TEST_BLUR_HINT =
  "전체 콘텐츠와 브랜드 기록 저장은 가입 후 확인할 수 있습니다.";

export const PUBLIC_TEST_TIME_HINT =
  "보통 30~60초 안에 발행 가능 샘플을 확인할 수 있습니다.";

export const PUBLIC_TEST_GATE_RETRY_HINT =
  "브랜드 특징 한 줄(예: 수제 브런치·파주 로컬 마케팅)을 주제에 넣으면 샘플 품질이 올라갑니다.";
