/**
 * BRICLOG 제품 준비도 루브릭 — 기능 50 + 사용자 50 = 100
 * @see scripts/product-readiness-score.mjs
 */

export const PRODUCT_SCORE_BANDS = {
  production: 85,
  beta: 70,
};

/** @typedef {{ score: number, max: number, note?: string }} RubricRow */

/**
 * @param {Record<string, unknown>} signals
 * @returns {{ functional: RubricRow[], user: RubricRow[], total: number, band: string }}
 */
export function computeProductReadinessScore(signals = {}) {
  const functional = scoreFunctional(signals);
  const user = scoreUser(signals);
  const functionalTotal = functional.reduce((s, r) => s + r.score, 0);
  const userTotal = user.reduce((s, r) => s + r.score, 0);
  const total = Math.round((functionalTotal + userTotal) * 10) / 10;
  const band =
    total >= PRODUCT_SCORE_BANDS.production
      ? "production"
      : total >= PRODUCT_SCORE_BANDS.beta
        ? "beta_plus"
        : "pre_beta";

  return { functional, user, total, band, functionalTotal, userTotal };
}

function scoreFunctional(s) {
  const slaPass = Number(s.channelSlaPassCount) || 0;
  const slaTotal = Number(s.channelSlaTotal) || 4;
  const slaRatio = slaTotal ? slaPass / slaTotal : 0;

  return [
    {
      id: "multi_channel",
      label: "멀티채널 생성",
      max: 10,
      score: round(7.5 + slaRatio * 2.5),
      note: `채널 SLA ${slaPass}/${slaTotal}`,
    },
    {
      id: "quality_engine",
      label: "품질·엔진",
      max: 12,
      score: s.qualityTestsPass ? 11 : 9,
      note: s.qualityTestsPass ? "회귀 테스트 통과" : "품질 테스트 미확인",
    },
    {
      id: "brand_learning",
      label: "브랜드 기억·학습",
      max: 8,
      score: round(
        (s.dbContentItems ? 2 : 0) +
          (s.dbBrandLearning ? 2 : 0) +
          (s.dbGlobalRules ? 2 : 0) +
          (s.dbDataAssets ? 1 : 0) +
          (s.engineBrandFirst ? 1 : 0)
      ),
      note: "Supabase 학습·저장 테이블",
    },
    {
      id: "feedback_loop",
      label: "피드백·재생성",
      max: 6,
      score: s.dbFeedbackIntents ? 6 : 4,
    },
    {
      id: "auth",
      label: "인증·온보딩",
      max: 4,
      score: s.smsOtpTable ? 3.5 : 3,
    },
    {
      id: "billing",
      label: "결제·요금",
      max: 4,
      score: s.tossConfigured ? 3.5 : 2,
      note: s.tossConfigured ? "Toss env 설정" : "베타 무료·Toss 미연동",
    },
    {
      id: "ops",
      label: "운영·관리",
      max: 6,
      score: round(
        (s.engineOpsOk ? 2 : 0) +
          (s.cronSecret ? 1.5 : 0) +
          (s.dbAdminStats ? 1.5 : 0) +
          (s.dbPublicTestQuota ? 1 : 0)
      ),
      note: "엔진·크론·관리자·공개테스트 쿼터",
    },
  ];
}

function scoreUser(s) {
  const uxPass = Number(s.uxPersonaPass) || 0;
  const uxTotal = Number(s.uxPersonaTotal) || 100;
  const uxRatio = uxTotal ? uxPass / uxTotal : 0;

  return [
    {
      id: "ui_stability",
      label: "UI·화면 안정성",
      max: 12,
      score: round(8 + uxRatio * 4),
      note: `100인 UX ${uxPass}/${uxTotal}`,
    },
    {
      id: "first_use",
      label: "첫 사용·이해",
      max: 10,
      score: round(
        5 +
          (s.publicTestLive ? 1.5 : 0) +
          (s.publicTestPreviewPass ? 2 : 0) +
          (s.signupDraftRestore ? 1 : 0)
      ),
      note: s.publicTestPreviewPass
        ? "공개 테스트 미리보기 통과"
        : "공개 테스트 게이트·가입 CTA",
    },
    {
      id: "publish_loop",
      label: "생성→복사→발행",
      max: 10,
      score: round(
        6 +
          (s.alwaysCompleteDelivery ? 2 : 0) +
          (s.publishMarkUi ? 1 : 0) +
          (s.uploadGuide ? 1 : 0)
      ),
    },
    {
      id: "result_trust",
      label: "결과물 신뢰",
      max: 8,
      score: s.alwaysCompleteDelivery ? 7.5 : 6,
    },
    {
      id: "speed",
      label: "속도·대기 체감",
      max: 6,
      score: speedScore(s),
      note: s.blogSlaMs ? `블로그 SLA ${Math.round(s.blogSlaMs / 1000)}s` : undefined,
    },
    {
      id: "mobile",
      label: "모바일·접근성",
      max: 4,
      score: s.mobileUxPass ? 3.5 : 3,
    },
  ];
}

function speedScore(s) {
  const ms = Number(s.blogSlaMs);
  if (!ms) return 4;
  if (ms <= 60_000) return 5.5;
  if (ms <= 120_000) return 5;
  if (ms <= 180_000) return 4.5;
  return 4;
}

function round(n) {
  return Math.round(n * 10) / 10;
}
