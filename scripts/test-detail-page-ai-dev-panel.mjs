import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { buildDetailPagePublicSample } from "../lib/product/detailPagePublicSample.js";
import {
  DETAIL_PAGE_AI_DEV_PANEL_50,
  evaluateDetailPageAiDevPanel,
} from "../lib/qa/detailPageAiDevPanel50.js";

assert.equal(DETAIL_PAGE_AI_DEV_PANEL_50.length, 50);
assert.equal(new Set(DETAIL_PAGE_AI_DEV_PANEL_50.map((d) => d.id)).size, 50);

const rice = buildDetailPagePublicSample("open-rice");
const beans = buildDetailPagePublicSample("open-beans");
const ricePanel = evaluateDetailPageAiDevPanel({ pack: rice.pack, html: rice.html });
const beansPanel = evaluateDetailPageAiDevPanel({ pack: beans.pack, html: beans.html });

assert.equal(ricePanel.votes.length, 50);
assert.equal(beansPanel.votes.length, 50);
assert.equal(ricePanel.measured.lyricHook, true);
assert.equal(ricePanel.measured.attributeHook, false);
assert.ok(ricePanel.measured.xl >= 2, `rice xl ${ricePanel.measured.xl}`);
assert.equal(ricePanel.summary.hire, false);
assert.ok(ricePanel.summary.topIssues.includes("후킹이 속성 나열이 아님"));
assert.ok(ricePanel.summary.mean < 88, `rice mean too high ${ricePanel.summary.mean}`);

const outDir = "artifacts/detail-page-ai-dev-panel";
mkdirSync(outDir, { recursive: true });
writeFileSync(
  `${outDir}/latest.json`,
  JSON.stringify(
    {
      at: new Date().toISOString(),
      rice: { measured: ricePanel.measured, summary: ricePanel.summary, votes: ricePanel.votes },
      beans: { measured: beansPanel.measured, summary: beansPanel.summary, votes: beansPanel.votes },
    },
    null,
    2
  )
);
writeFileSync(
  `${outDir}/latest-summary.json`,
  JSON.stringify(
    {
      at: new Date().toISOString(),
      rice: ricePanel.summary,
      beans: beansPanel.summary,
    },
    null,
    2
  )
);

console.log(
  `ok ai-dev-50 rice=${ricePanel.summary.mean} hire=${ricePanel.summary.hire} pass=${ricePanel.summary.passCount}/50 issues=${ricePanel.summary.topIssues.join("|")}`
);
console.log(
  `ok ai-dev-50 beans=${beansPanel.summary.mean} hire=${beansPanel.summary.hire} pass=${beansPanel.summary.passCount}/50 issues=${beansPanel.summary.topIssues.join("|")}`
);
console.log("lenses rice", JSON.stringify(ricePanel.summary.byLens));
console.log("lenses beans", JSON.stringify(beansPanel.summary.byLens));
console.log("rice lowest", ricePanel.summary.lowest.map((v) => `${v.name} ${v.score} ${v.note}`).join(" / "));
