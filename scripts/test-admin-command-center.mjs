import assert from "node:assert/strict";
import { buildAdminCommandCenter } from "../lib/admin/buildAdminCommandCenter.js";

const view = buildAdminCommandCenter({
  advisory: {
    headline: "운영 상태 양호",
    healthScore: 93,
    healthBand: "production",
    pendingInsightsCount: 2,
    funnel: { visitsToday: 12, signupsToday: 1, sampleRuns7d: 5 },
    actions: [
      { id: "a1", priority: "now", title: "블로그 배치", advice: "확인" },
      { id: "a2", priority: "soon", title: "관찰", advice: "ok" },
    ],
  },
  qualityOps: {
    crossChannel: {
      passRate: 93.2,
      pass: 218,
      total: 234,
      freshness: { label: "2시간 전" },
      byChannel: {
        blog: { passRate: 91, pass: 71, total: 78, target: 90, status: "ok" },
        place: { passRate: 100, pass: 78, total: 78, target: 95, status: "ok" },
        instagram: { passRate: 88.5, pass: 69, total: 78, target: 88, status: "ok" },
      },
    },
    readiness: { total: 93, band: "production" },
    alerts: [],
  },
  stats: null,
  errors: [],
});

assert.equal(view.pulse, "urgent");
assert.equal(view.nowActions.length, 1);
assert.equal(view.channels.length, 3);
assert.equal(view.readiness, 93);
assert.ok(view.signals.some((s) => s.id === "samples"));

const calm = buildAdminCommandCenter({
  advisory: { headline: "ok", actions: [] },
  qualityOps: {
    crossChannel: {
      passRate: 95,
      byChannel: { blog: { passRate: 92, status: "ok", target: 90 } },
    },
    alerts: [],
  },
  errors: [],
});
assert.equal(calm.pulse, "ok");

const stale = buildAdminCommandCenter({
  advisory: { headline: "ok", healthScore: 99, actions: [] },
  qualityOps: {
    crossChannel: {
      passRate: 97.4,
      freshness: { stale: true, label: "2000시간 전 (갱신 필요)" },
      byChannel: { blog: { passRate: 92.3, status: "ok", target: 90 } },
    },
    readiness: {
      total: 99,
      band: "production",
      freshness: { stale: true, label: "240시간 전 (갱신 필요)" },
    },
    channelSla: { skipped: true, skipReason: "workspace_missing" },
    alerts: [
      {
        severity: "warn",
        message: "교차 채널 배치가 2000시간 전 (갱신 필요)입니다. 이 통과율은 오늘 품질이 아닙니다.",
      },
    ],
  },
  errors: [],
});
assert.equal(stale.pulse, "watch");
assert.match(stale.editorialVerdict, /오늘 품질이 아닙니다|오늘 품질로 읽지/);

console.log("OK: admin-command-center", {
  pulse: view.pulse,
  blog: view.channels[0].passRate,
});
