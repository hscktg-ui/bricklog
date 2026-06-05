import { createServiceSupabase } from "@/lib/supabase/server";
import { kstDateString, kstDayRangeIso } from "@/lib/cron/kstDate";
import { aggregateDailyUsageMetrics } from "@/lib/cron/aggregateDailyUsage";
import fs from "fs";
import path from "path";
import { safeLocalCronWrite } from "@/lib/cron/localArtifacts";

const DOC_PATH = path.join(process.cwd(), "docs", "daily-digest-noon.md");
const ROW_LIMIT = 8000;

/**
 * KST 당일 00:00~현재(정오 크론 시점) 부분 집계 — 운영 피드백용
 */
export async function runNoonDigestPipeline() {
  const snapshotDate = kstDateString();
  const { startIso } = kstDayRangeIso(snapshotDate);
  const endIso = new Date().toISOString();

  const db = createServiceSupabase();
  if (!db) {
    return { ok: false, status: 503, error: "service_client_unavailable" };
  }

  const [profilesRes, itemsRes, eventsRes, feedbackRes] = await Promise.all([
    db
      .from("profiles")
      .select(
        "id, created_at, nickname, contact_phone, profile_completed_at, primary_use_case"
      )
      .gte("created_at", startIso)
      .lte("created_at", endIso)
      .limit(ROW_LIMIT),
    db
      .from("content_items")
      .select("id, channel, quality_score, created_at")
      .gte("created_at", startIso)
      .lte("created_at", endIso)
      .limit(ROW_LIMIT),
    db
      .from("content_events")
      .select("id, event_type, created_at")
      .gte("created_at", startIso)
      .lte("created_at", endIso)
      .limit(ROW_LIMIT),
    db
      .from("content_feedback")
      .select("reaction, tags, created_at")
      .gte("created_at", startIso)
      .lte("created_at", endIso)
      .limit(ROW_LIMIT),
  ]);

  const metrics = aggregateDailyUsageMetrics({
    snapshotDate,
    startIso,
    endIso,
    profiles: profilesRes.data || [],
    contentItems: itemsRes.data || [],
    contentEvents: eventsRes.data || [],
    contentFeedback: feedbackRes.data || [],
    contentPerformance: [],
    subscriptions: [],
  });

  const u = metrics.usage || {};
  const ph = u.profileHealth || {};
  const lines = [
    "# BRICLOG 정오 피드백 (KST)",
    "",
    `> ${new Date().toISOString()} · 당일 **${snapshotDate}** 00:00~현재`,
    "",
    "## 오늘까지",
    "",
    `- 가입: **${u.signups ?? 0}**`,
    `- 콘텐츠 생성: **${u.contentItems ?? 0}**`,
    `- 피드백: **${u.contentFeedback ?? 0}** (좋음 ${u.feedbackGoodPct ?? 0}%)`,
    `- 복사 이벤트: **${u.copies ?? 0}**`,
    "",
    "## 프로필 저장 (오늘 가입)",
    "",
    `- 닉네임 입력: ${ph.withNickname ?? 0} / ${ph.signups ?? 0}`,
    `- 연락처: ${ph.withPhone ?? 0}`,
    `- 완료 표시: ${ph.completed ?? 0}`,
    "",
    "자정 크론 전일 집계는 `docs/daily-run-latest.md` 참고.",
  ];

  safeLocalCronWrite(() => {
    fs.mkdirSync(path.dirname(DOC_PATH), { recursive: true });
    fs.writeFileSync(DOC_PATH, lines.join("\n"), "utf8");
  });

  return {
    ok: true,
    snapshotDate,
    path: DOC_PATH,
    metrics,
  };
}
