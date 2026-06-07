import assert from "node:assert/strict";
import {
  buildBriclogContextScore,
  buildWorkspaceContextScore,
} from "@/lib/publicTest/briclogContextScore.js";
import { buildPublicTestMetrics } from "@/lib/publicTest/publicTestMetrics.js";

const input = {
  brandName: "테스트카페",
  region: "서울",
  topic: "봄 브런치",
  industry: "카페",
  contextLock: { industry: "카페" },
};
const pack = {
  sections: [{ heading: "소개", body: "본문 ".repeat(80) }],
  _meta: {
    qualityScore: {
      total: 86,
      v3: {
        scores: { brand: 88, region: 84, topic: 85, trust: 82 },
      },
    },
    humanWritingDelivery: { humanReady: true, displayReady: true },
    publishReady: true,
  },
};
const gate = {
  ok: true,
  relevance: { rate: 0.84 },
  infoCount: 5,
  grounded: { ok: true, rate: 0.8 },
};

const score = buildBriclogContextScore(input, pack, gate);
assert.equal(score.publishScore, 86);
assert.equal(score.axes.length, 4);
assert.equal(score.axes[0].score, 88);
assert.ok(score.channels.find((c) => c.id === "blog")?.ready);
assert.equal(score.readiness.status, "ready");

const metrics = buildPublicTestMetrics(input, pack, gate);
assert.equal(metrics.contextScore.publishScore, 86);
assert.ok(metrics.improvementHint.includes("작업실"));
assert.ok(score.depth?.level >= 3);

const workspace = buildWorkspaceContextScore(pack, input, {
  hasPlace: true,
  hasInsta: false,
});
assert.ok(workspace.channels.find((c) => c.id === "place")?.ready);
assert.ok(workspace.depth?.aheadOfLens);

console.log("OK: briclog context score");
