import {
  isBrandFirstEngineEnabled,
  isOfficialSourceFirstEnabled,
  isStrictBrandGuardEnabled,
} from "@/lib/config/brandEngineFlags";
import {
  isAutoEvolveFromFeedbackEnabled,
  isFriendBetaLearningMode,
} from "@/lib/config/engineEvolutionFlags";
import { createServiceSupabase } from "@/lib/supabase/server";
import { getResearchStackAStatus } from "@/lib/config/researchStackA";
import { getCoreEnginePublicProfile } from "@/lib/product/briclogCoreEngine";

function cronSecretConfigured() {
  return Boolean(
    (process.env.BRICLOG_CRON_SECRET ||
      process.env.CRON_SECRET ||
      process.env.TREND_COLLECT_SECRET)?.trim(),
  );
}

async function probeMemoryTables() {
  const client = createServiceSupabase();
  if (!client) {
    return {
      serviceRole: false,
      contentItems: false,
      brandLearning: false,
      globalInsights: false,
    };
  }

  async function tableOk(name, idCol = "id") {
    for (let attempt = 0; attempt < 2; attempt++) {
      const { error } = await client.from(name).select(idCol).limit(1);
      if (!error) return true;
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 120));
        continue;
      }
    }
    return false;
  }

  const [
    contentItems,
    brandLearning,
    globalInsights,
    globalEngineRules,
    contentFeedback,
    publicTestRuns,
    siteVisits,
    profilesLastSeen,
  ] = await Promise.all([
    tableOk("content_items"),
    tableOk("brand_learning_profiles"),
    tableOk("global_quality_insights"),
    tableOk("global_engine_rules", "rule_key"),
    tableOk("content_feedback"),
    tableOk("public_test_runs"),
    tableOk("site_visits"),
    tableOk("profiles", "last_seen_at"),
  ]);

  return {
    serviceRole: true,
    contentItems,
    brandLearning,
    globalInsights,
    globalEngineRules,
    contentFeedback,
    publicTestRuns,
    siteVisits,
    profilesLastSeen,
  };
}

/** 운영·점검용 — 민감값 없음 */
export async function getEngineOpsStatus() {
  const otpClient = createServiceSupabase();
  const [memory, otpTable] = await Promise.all([
    probeMemoryTables(),
    (async () => {
      if (!otpClient) return false;
      const { error } = await otpClient
        .from("phone_otp_verifications")
        .select("id")
        .limit(1);
      return !error;
    })(),
  ]);

  return {
    ok:
      memory.serviceRole &&
      memory.contentItems &&
      memory.brandLearning &&
      memory.globalEngineRules,
    coreEngine: getCoreEnginePublicProfile(),
    engine: {
      brandFirst: isBrandFirstEngineEnabled(),
      strictBrandGuard: isStrictBrandGuardEnabled(),
      officialSourceFirst: isOfficialSourceFirstEnabled(),
      autoEvolveFromFeedback: isAutoEvolveFromFeedbackEnabled(),
      friendBetaLearning: isFriendBetaLearningMode(),
      researchStackA: getResearchStackAStatus(),
    },
    cron: {
      secretConfigured: cronSecretConfigured(),
      dailyDevelopPath: "/api/cron/daily-develop",
      vercelScheduleUtc: "0 15 * * *",
    },
    memory,
    sms: { otpTable },
    notes: [
      !memory.contentItems
        ? "Supabase schema-v3-memory.sql 미적용"
        : null,
      !memory.brandLearning
        ? "Supabase schema-v6-feedback-learning.sql 미적용"
        : null,
      !memory.globalInsights
        ? "global_quality_insights 없음 — 야간 통합 인사이트 후보 생성 불가"
        : null,
      !memory.globalEngineRules
        ? "schema-v15-global-engine-rules.sql 미적용 — 피드백→전역 엔진 반영 불가"
        : null,
      !memory.contentFeedback
        ? "content_feedback 없음 — schema-v6-feedback-learning.sql 미적용"
        : null,
      !cronSecretConfigured()
        ? "BRICLOG_CRON_SECRET 미설정 — Vercel Cron 인증 실패"
        : null,
      !isBrandFirstEngineEnabled()
        ? "BRICLOG_BRAND_FIRST_ENGINE 꺼짐 — 사용자별 브랜드 앵커 미적용"
        : null,
      !memory.publicTestRuns
        ? "public_test_runs 없음 — schema-v19-public-test.sql 적용 필요"
        : null,
      !memory.siteVisits || !memory.profilesLastSeen
        ? "schema-v17-admin-ops.sql 미적용 — 실시간 접속·방문 통계 제한"
        : null,
    ].filter(Boolean),
  };
}
