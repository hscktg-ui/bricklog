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

export const PUBLIC_TEST_QUOTA_SIGNUP_HEADLINE =
  "오늘 무료 테스트는 여기까지예요";

export const PUBLIC_TEST_QUOTA_SIGNUP_SUB =
  "가입하면 방금 입력한 브랜드·주제 그대로 이번 달 운영을 작업실에서 이어갈 수 있어요. 보통 2분이면 됩니다.";

export const PUBLIC_TEST_ERROR_SIGNUP_SUB =
  "가입 후에는 조사·재작성·세 채널 초안·운영 계획까지 한 번에 이어집니다. 테스트에 쓴 내용은 그대로 복원됩니다. 지금은 전 기능 무료입니다.";

export const PUBLIC_TEST_QUOTA_SIGNUP_CTA =
  "무료로 가입 · 이번 달 운영 이어가기";

export const PUBLIC_TEST_ERROR_SIGNUP_CTA =
  "무료로 가입하고 작업실에서 다시 쓰기";

/** 브랜드명 있으면 오류 CTA를 브랜드 작업실로 구체화 */
export function resolvePublicTestErrorSignupCta(brandName = "") {
  const brand = String(brandName || "").trim();
  if (brand) return `「${brand}」 작업실에서 무료로 이어가기`;
  return PUBLIC_TEST_ERROR_SIGNUP_CTA;
}
export const PUBLIC_TEST_QUOTA_EXCEEDED =
  "오늘의 무료 테스트를 모두 사용했습니다. 브랜드 작업실을 만들면 계속 사용할 수 있습니다.";

export const PUBLIC_TEST_GATE_FAIL =
  "입력을 조금만 구체적으로 적어 주세요.\n브랜드 특징 한 줄(예: 아이스 브런치·여름 꽃다발 픽업)을 주제에 넣거나, 위 「다른 예시 보기」로 가상 브랜드를 선택해 보세요.";

export const PUBLIC_TEST_GATE_FAIL_SIGNUP_HINT =
  "가입 후 브랜드 작업실에서는 조사·재작성으로 발행 가능한 글까지 이어집니다.";

export const PUBLIC_TEST_BLUR_HINT =
  "아래는 발행 샘플 일부입니다. 전체 본문·복사·이번 달 운영은 가입 후 작업실에서 이어집니다.";

export const PUBLIC_TEST_CHANNEL_HEADLINE = "같은 주제 · 세 채널 다른 포맷";

export const PUBLIC_TEST_SIGNUP_GAP_HEADLINE =
  "가입 후 풀리는 것 · 이번 달 운영 계획";

export const PUBLIC_TEST_TIME_HINT =
  "가상 브랜드 예시는 바로 확인됩니다. 직접 입력 시 보통 30초 이내에 결과가 나옵니다.";

export const PUBLIC_TEST_TOPIC_HINT =
  "브랜드 특징 한 줄(예: 아이스 브런치·여름 꽃다발 픽업)을 주제에 넣으면 샘플 품질이 올라갑니다.";

/** @deprecated — PUBLIC_TEST_TOPIC_HINT 사용 */
export const PUBLIC_TEST_GATE_RETRY_HINT = PUBLIC_TEST_TOPIC_HINT;

export const PUBLIC_TEST_TRY_SAMPLE_CTA = "가상 예시로 1분 체험";

export const PUBLIC_TEST_LOADING_MESSAGE =
  "발행 가능한 샘플을 준비하고 있습니다.";

export const PUBLIC_TEST_SAMPLE_BADGE = "가상 브랜드 예시";

export const PUBLIC_TEST_DEMO_FALLBACK_BADGE =
  "업종 맞춤 샘플 · 입력하신 브랜드명 반영";

/** 가입 전 테스트 LLM 루프 예산 (조사 제외) */
export const PUBLIC_TEST_LLM_BUDGET_MS =
  Number(process.env.PUBLIC_TEST_LLM_BUDGET_MS) || 75_000;
