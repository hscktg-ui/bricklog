import fs from "fs";
import path from "path";
import {
  DELIVERY_TRUST_PUBLISH,
  DELIVERY_TRUST_POLISH,
  DELIVERY_TRUST_REFERENCE,
} from "@/lib/product/deliveryTrustDisplay";
import { hintForFailReason } from "@/lib/admin/operatorErrorHints";

const CHANNEL_TARGETS = {
  blog: 90,
  place: 95,
  instagram: 88,
  overall: 92,
};

/** 오늘 배포·모니터링 체크리스트 (관리자용) */
export const OPERATOR_ROLLOUT_CHECKLIST = [
  {
    id: "cta_ssot",
    label: "「조사 후 글 받기」 CTA SSOT",
    module: "lib/product/blogCtaCopy.js",
    watch: "작업실·랜딩 CTA 문구 일치, 실패 시 단일 행동 유도",
  },
  {
    id: "delivery_trust",
    label: "송출 신뢰 배지 (발행 가능 / 다듬기 / 참고용)",
    module: "DeliveryTrustBadge · deliveryTrustDisplay.js",
    watch: "rescue·preview 경로에서 참고용 과다 노출 여부",
  },
  {
    id: "blog_gen_hint",
    label: "생성 실패·대기 UX (BlogGenHintPanel)",
    module: "components/workspace/BlogGenHintPanel.jsx",
    watch: "「조사 중」+ 실패 메시지 중복 노출 없음",
  },
  {
    id: "briclog_next",
    label: "브릭로그 다음 · 월간 운영 리듬",
    module: "BriclogNextHomeStrip · BriclogNextPanel",
    watch: "홈 히어로·채널 이어 만들기 전환",
  },
  {
    id: "tablet_layout",
    label: "태블릿(768–1023) 작업실 분할",
    module: "channelWorkspaceLayout.js",
    watch: "md 구간 폼·원고 좌우 배치",
  },
  {
    id: "research_snippet",
    label: "생성 중 조사 스니펫",
    module: "GeneratingResultPlaceholder",
    watch: "대기 체감·조사 팩트 수 노출",
  },
  {
    id: "insta_caption",
    label: "인스타 캡션 휴먼 톤",
    module: "instaCaptionHumanize.js",
    watch: "「이어서」 반복 없음 · 피드 줄바꿈 리듬",
  },
  {
    id: "belief_boost",
    label: "블로그 belief·배치 부스트",
    module: "prodBeliefBoost · batchBeliefBoost",
    watch: "cross-channel blog 90% 목표 (현재 89.7%)",
  },
];

function readJsonSafe(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function hoursSince(iso) {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.round((ms / 3_600_000) * 10) / 10;
}

function freshness(iso, warnHours = 48) {
  const ageH = hoursSince(iso);
  if (ageH == null) return { at: null, ageHours: null, stale: true, label: "없음" };
  const stale = ageH > warnHours;
  return {
    at: iso,
    ageHours: ageH,
    stale,
    label: stale ? `${ageH}시간 전 (갱신 필요)` : `${ageH}시간 전`,
  };
}

function pct(part, whole) {
  if (!whole || whole <= 0) return null;
  return Math.round((part / whole) * 1000) / 10;
}

function channelStatus(passRate, target) {
  if (passRate == null) return "unknown";
  if (passRate >= target) return "ok";
  if (passRate >= target - 2) return "warn";
  return "fail";
}

function summarizeCrossBatch(raw) {
  if (!raw) return null;

  const byChannel = {};
  const src = raw.byChannel || {};
  for (const [ch, data] of Object.entries(src)) {
    const target = CHANNEL_TARGETS[ch] ?? 90;
    const passRate = data.passRate ?? pct(data.pass, data.total);
    byChannel[ch] = {
      ...data,
      passRate,
      target,
      gapToTarget: passRate != null ? Math.round((passRate - target) * 10) / 10 : null,
      status: channelStatus(passRate, target),
      neededForTarget:
        passRate != null && data.total
          ? Math.max(0, Math.ceil((target / 100) * data.total) - (data.pass ?? 0))
          : null,
    };
  }

  const failReasons = Object.entries(raw.failReasons || {})
    .map(([reason, count]) => ({
      reason,
      count,
      hint: hintForFailReason(reason)?.summary || null,
    }))
    .sort((a, b) => b.count - a.count);

  const failedSamples = (raw.failedSamples || []).slice(0, 12).map((s) => ({
    ...s,
    failHint: (s.failReasons || [])
      .map((r) => hintForFailReason(r)?.summary)
      .filter(Boolean)[0] || null,
  }));

  const beliefs = (raw.failedSamples || [])
    .map((s) => s.belief)
    .filter((n) => typeof n === "number");
  const beliefAvg =
    beliefs.length > 0
      ? Math.round(beliefs.reduce((a, b) => a + b, 0) / beliefs.length)
      : null;

  const finishedAt = raw.finishedAt ?? raw.generatedAt ?? raw.startedAt;

  return {
    startedAt: raw.startedAt ?? null,
    finishedAt,
    freshness: freshness(finishedAt, 72),
    total: raw.total ?? null,
    pass: raw.pass ?? null,
    fail: raw.fail ?? null,
    passRate: raw.passRate ?? pct(raw.pass, raw.total),
    target: CHANNEL_TARGETS.overall,
    status: channelStatus(raw.passRate ?? pct(raw.pass, raw.total), CHANNEL_TARGETS.overall),
    byChannel,
    failReasons,
    failedSamples,
    failedBeliefAvg: beliefAvg,
    blogGapNote:
      byChannel.blog?.status === "warn" || byChannel.blog?.status === "fail"
        ? `블로그 ${byChannel.blog.pass}/${byChannel.blog.total} (${byChannel.blog.passRate}%) — 목표 ${CHANNEL_TARGETS.blog}%까지 ${byChannel.blog.neededForTarget ?? "?"}건 추가 통과 필요`
        : null,
  };
}

function summarizeReadiness(raw) {
  if (!raw) return null;
  return {
    at: raw.at ?? null,
    freshness: freshness(raw.at, 168),
    total: raw.total ?? null,
    band: raw.band ?? null,
    functionalTotal: raw.functionalTotal ?? null,
    userTotal: raw.userTotal ?? null,
    functional: raw.functional || [],
    user: raw.user || [],
    gaps: (raw.gaps || []).map((g) => ({
      ...g,
      priority: (g.pct ?? 100) < 60 ? "soon" : (g.pct ?? 100) < 85 ? "watch" : "ok",
    })),
  };
}

function summarizeChannelSla(raw) {
  if (!raw) return null;
  const summary = raw.summary || {};
  const runs = raw.runs || [];
  const blogRuns = runs.filter((r) => r.channel === "blog");
  const blogMs = blogRuns
    .map((r) => r.elapsedMs ?? r.durationMs ?? r.ms)
    .filter((n) => typeof n === "number");
  const blogAvgSec =
    blogMs.length > 0
      ? Math.round(blogMs.reduce((a, b) => a + b, 0) / blogMs.length / 1000)
      : null;

  return {
    at: raw.at ?? null,
    freshness: freshness(raw.at, 168),
    slaMs: raw.slaMs ?? 300_000,
    summary: {
      total: summary.total ?? runs.length,
      passed: summary.passed ?? null,
      failed: summary.failed ?? 0,
    },
    blogAvgSec,
    withinSla: summary.withinSla || [],
    overSlaOrError: summary.overSlaOrError || [],
  };
}

function summarizeBlogProbe(raw) {
  if (!raw) return null;
  const results = raw.results || raw.samples || [];
  const failed = results.filter((r) => r.ok === false || r.pass === false);
  return {
    at: raw.at ?? raw.generatedAt ?? null,
    freshness: freshness(raw.at ?? raw.generatedAt, 168),
    total: results.length || raw.total || null,
    failed: failed.length,
    passRate:
      results.length > 0
        ? pct(results.length - failed.length, results.length)
        : raw.passRate ?? null,
    topFails: failed.slice(0, 5).map((r) => ({
      id: r.id ?? r.label,
      reasons: r.failReasons || r.reasons || [],
      belief: r.belief ?? null,
    })),
  };
}

/**
 * Admin 품질·운영 스냅샷 (로컬 artifacts·config 읽기)
 */
export function getQualityOpsSnapshot() {
  const root = process.cwd();
  const crossBatch = readJsonSafe(
    path.join(root, "artifacts/cross-channel-batch/latest-summary.json")
  );
  const readiness = readJsonSafe(
    path.join(root, "config/product-readiness-score.json")
  );
  const channelSla = readJsonSafe(path.join(root, "config/channel-sla-report.json"));
  const blogProbe = readJsonSafe(
    path.join(root, "config/blog-category-probe-report.json")
  );

  const cross = summarizeCrossBatch(crossBatch);
  const readinessSummary = summarizeReadiness(readiness);
  const sla = summarizeChannelSla(channelSla);
  const probe = summarizeBlogProbe(blogProbe);

  const deliveryTrustTiers = [
    DELIVERY_TRUST_PUBLISH,
    DELIVERY_TRUST_POLISH,
    DELIVERY_TRUST_REFERENCE,
  ];

  const alerts = [];
  if (!cross) {
    alerts.push({
      id: "no_cross_batch",
      severity: "info",
      message:
        "cross-channel 배치 요약 없음 — npm run test:cross-channel-batch 후 artifacts/cross-channel-batch 확인",
    });
  } else if (cross.byChannel?.blog?.status !== "ok") {
    alerts.push({
      id: "blog_below_target",
      severity: "warn",
      message: cross.blogGapNote,
      action: "stampBatchBlogFirstDeliveryMeta · test:cross-channel-batch 재실행",
    });
  }
  if (cross?.byChannel?.instagram?.status === "warn") {
    alerts.push({
      id: "instagram_near_target",
      severity: "watch",
      message: `인스타 ${cross.byChannel.instagram.passRate}% — 목표 ${CHANNEL_TARGETS.instagram}%`,
    });
  }
  if (readinessSummary?.gaps?.some((g) => g.id === "speed" && (g.pct ?? 100) < 70)) {
    alerts.push({
      id: "speed_gap",
      severity: "watch",
      message: "속도·대기 체감 준비도 낮음 — 블로그 SLA·조사 스니펫 UX 모니터링",
    });
  }
  if (sla?.blogAvgSec && sla.slaMs && sla.blogAvgSec * 1000 > sla.slaMs) {
    alerts.push({
      id: "blog_sla_over",
      severity: "watch",
      message: `블로그 평균 ${sla.blogAvgSec}s — SLA ${Math.round(sla.slaMs / 1000)}s 초과`,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    targets: CHANNEL_TARGETS,
    rollout: OPERATOR_ROLLOUT_CHECKLIST,
    deliveryTrust: {
      tiers: deliveryTrustTiers,
      batchFailedBeliefAvg: cross?.failedBeliefAvg ?? null,
      note: "실사용 UI는 pack 메타 기준. 배치 실패 샘플 belief는 human_editor·CQ 게이트 미통과 지표.",
    },
    crossChannel: cross,
    readiness: readinessSummary,
    channelSla: sla,
    blogProbe: probe,
    alerts,
    dataSources: {
      crossChannelBatch: Boolean(crossBatch),
      readiness: Boolean(readiness),
      channelSla: Boolean(channelSla),
      blogProbe: Boolean(blogProbe),
      prodNote:
        "Vercel prod에는 artifacts·config 리포트가 없을 수 있습니다. 배치는 로컬 실행 후 요약을 확인하거나 야간 크론·.data 로그를 봅니다.",
    },
    commands: [
      "npm run test:cross-channel-batch",
      "npm run test:product-score",
      "npm run test:channel-sla:prod",
      "npm run test:batch-belief-boost",
      "npm run test:blog-cta-copy",
    ],
  };
}
