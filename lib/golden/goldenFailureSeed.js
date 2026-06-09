/**
 * 실패글 시드 — 품질 게이트 학습·감지용 (복사 금지·패턴 참고)
 */
import {
  matchesFailureSamplePattern,
  resolveFailurePatternsForIndustry,
} from "@/lib/golden/goldenFailurePatterns";

export const GOLDEN_FAILURE_SAMPLES = [
  {
    id: "fail-placeholder-flower",
    industry: "flower_shop",
    fail_reason: "placeholder",
    title: "[실패] placeholder 꽃집 글",
    content:
      "이용 볼 때 좋은내용을 중립적으로 정리했습니다. 비교가 수월해요. 확인해봤어요. 브랜드명 지역명에서 이용을 볼 때 조건·구성을 안내합니다.",
  },
  {
    id: "fail-industry-mix-flower",
    industry: "flower_shop",
    fail_reason: "industry_mix",
    title: "[실패] 꽃집+식품 혼입",
    content:
      "꽃을 고를 때 알레르기 성분과 원재료 표기, 첨가물 성분표를 확인하세요. 전시 관련 조건과 제품 구성을 비교가 수월해요.",
  },
  {
    id: "fail-voice-mix",
    industry: "cafe",
    fail_reason: "voice_mix",
    title: "[실패] 말투 혼합",
    content:
      "안녕하세요. 오늘은 카페에 대해 알아보겠습니다. 메뉴가 좋습니다. 커피가 맛있어요. 방문했는데요. 추천합니다.",
  },
  {
    id: "fail-furniture-overclaim",
    industry: "furniture",
    fail_reason: "overclaim",
    title: "[실패] 가구 과장",
    content: "무조건 추천합니다. 100% 만족 보장. 최저가. 평생 사용 가능. 허리 통증 완화 보장.",
  },
  {
    id: "fail-medical-claim",
    industry: "medical",
    fail_reason: "medical_claim",
    title: "[실패] 의료 단정",
    content: "완치 보장. 100% 효과. 반드시 낫습니다. 최고 병원. 부작용 없음. 결과 보장.",
  },
];

export function getFailurePatternsForIndustry(industryKey, input = {}) {
  return resolveFailurePatternsForIndustry(industryKey, input);
}

export { matchesFailureSamplePattern, resolveFailurePatternsForIndustry };
