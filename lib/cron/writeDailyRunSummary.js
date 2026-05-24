import fs from "fs";
import path from "path";

const DOC_PATH = path.join(process.cwd(), "docs", "daily-run-latest.md");

/**
 * Operator-facing summary (no PII, no content bodies).
 */
export function buildDailyRunMarkdown({ metrics, learning, ranAt, idempotent }) {
  const u = metrics?.usage || {};
  const lines = [
    "# BRICLOG 일일 개발 루프 (최신)",
    "",
    `> 자동 생성 · ${ranAt || new Date().toISOString()} · KST 기준일 **${metrics?.snapshotDate || "—"}**`,
    idempotent ? "> ⚠️ 이미 처리된 날짜 — 기존 스냅샷 재사용" : "",
    "",
    "## 사용량 (전일 집계)",
    "",
    `| 항목 | 값 |`,
    `|------|-----|`,
    `| 가입 | ${u.signups ?? 0} |`,
    `| 콘텐츠 생성 | ${u.contentItems ?? 0} |`,
    `| 이벤트 | ${u.contentEvents ?? 0} |`,
    `| 피드백 | ${u.contentFeedback ?? 0} |`,
    `| 성과 기록 | ${u.contentPerformance ?? 0} |`,
    `| 평균 품질 | ${u.avgQualityScore ?? "—"} |`,
    `| 복사율 | ${u.copyRatePct ?? 0}% |`,
    `| 재작성율 | ${u.rewriteRatePct ?? 0}% |`,
    `| 피드백 좋음 비율 | ${u.feedbackGoodPct ?? 0}% (${u.feedbackTotal ?? 0}건) |`,
    "",
  ];

  const ph = u.profileHealth;
  if (ph) {
    lines.push(
      "## 프로필 저장 (당일 가입)",
      "",
      `| 항목 | 값 |`,
      `|------|-----|`,
      `| 가입 | ${ph.signups ?? 0} |`,
      `| 닉네임 | ${ph.withNickname ?? 0} |`,
      `| 연락처 | ${ph.withPhone ?? 0} |`,
      `| 완료 | ${ph.completed ?? 0} |`,
      `| 사용목적 | ${ph.withUseCase ?? 0} |`,
      ""
    );
  }

  lines.push(
    "## 엔진 개선 (승인 전)",
    "",
    `- 브랜드 학습 프로필 갱신: **${learning?.brandsRecomputed ?? 0}** (스킵 ${learning?.brandsSkipped ?? 0})`,
    `- 전역 인사이트 신규: **${learning?.insightsInserted ?? 0}** / 후보 ${learning?.insightsSuggested ?? 0}`,
    "",
    "규칙은 **자동 적용되지 않습니다.** `/admin`에서 인사이트 승인 후 반영하세요.",
    ""
  );

  if (u.topFailReasons?.length) {
    lines.push("### 실패 사유 TOP");
    for (const { reason, count } of u.topFailReasons.slice(0, 5)) {
      lines.push(`- ${reason} (${count})`);
    }
    lines.push("");
  }

  if (u.topFeedbackTags?.length) {
    lines.push("### 피드백 태그 TOP");
    for (const { tag, count } of u.topFeedbackTags.slice(0, 5)) {
      lines.push(`- ${tag} (${count})`);
    }
    lines.push("");
  }

  lines.push(
    "---",
    "",
    "스케줄: `docs/DAILY_CRON_SETUP.md` · 정오 요약: `docs/daily-digest-noon.md`"
  );
  return lines.filter(Boolean).join("\n");
}

export function writeDailyRunSummaryDoc(payload) {
  const md = buildDailyRunMarkdown(payload);
  fs.mkdirSync(path.dirname(DOC_PATH), { recursive: true });
  fs.writeFileSync(DOC_PATH, md, "utf8");
  return DOC_PATH;
}
