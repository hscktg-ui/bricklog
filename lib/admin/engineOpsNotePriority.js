/**
 * engineOps.notes → 운영 조언 우선순위 (오탐 「지금」 방지)
 */

const RULES = [
  {
    re: /schema-v3-memory|content_items.*미적용|contentItems.*false/i,
    priority: "now",
    critical: true,
    title: "핵심 DB 스키마",
    action: "Supabase schema-v3-memory.sql 적용을 확인하세요.",
  },
  {
    re: /schema-v6|brand_learning|content_feedback/i,
    priority: "now",
    critical: true,
    title: "학습·피드백 스키마",
    action: "schema-v6-feedback-learning.sql 적용을 확인하세요.",
  },
  {
    re: /schema-v15|global_engine_rules/i,
    priority: "now",
    critical: true,
    title: "전역 엔진 규칙",
    action: "schema-v15-global-engine-rules.sql 적용을 확인하세요.",
  },
  {
    re: /BRICLOG_CRON_SECRET|Cron 인증 실패/i,
    priority: "soon",
    critical: false,
    title: "크론 인증",
    action: "Vercel에 BRICLOG_CRON_SECRET 설정·daily-develop 스케줄 확인.",
  },
  {
    re: /BRICLOG_BRAND_FIRST_ENGINE 꺼짐/i,
    priority: "watch",
    critical: false,
    title: "브랜드 앵커 엔진",
    action:
      "프로덕션은 기본 켜짐(NODE_ENV). 꺼져 있으면 Vercel BRICLOG_BRAND_FIRST_ENGINE=1 또는 sync:vercel-env 확인.",
  },
  {
    re: /global_quality_insights 없음/i,
    priority: "watch",
    critical: false,
    title: "야간 인사이트 후보",
    action: "선택 스키마 — daily-develop 크론이 돌면 후보 생성.",
  },
  {
    re: /schema-v17|site_visits|last_seen/i,
    priority: "watch",
    critical: false,
    title: "실시간 통계",
    action: "schema-v17-admin-ops.sql — 방문·접속 통계 정밀도 향상.",
  },
  {
    re: /public_test_runs|schema-v19/i,
    priority: "soon",
    critical: false,
    title: "공개 테스트 쿼터",
    action: "schema-v19-public-test.sql 적용 확인.",
  },
];

/**
 * @param {string} note
 */
export function classifyEngineOpsNote(note = "") {
  const text = String(note || "").trim();
  for (const rule of RULES) {
    if (rule.re.test(text)) {
      return {
        priority: rule.priority,
        critical: rule.critical,
        title: rule.title,
        action: rule.action,
      };
    }
  }
  return {
    priority: "soon",
    critical: false,
    title: "인프라 점검",
    action: "Vercel 환경변수·Supabase 스키마를 확인하세요.",
  };
}

export function hasCriticalNowAction(actions = []) {
  return actions.some((a) => a.priority === "now" && a.critical !== false);
}
