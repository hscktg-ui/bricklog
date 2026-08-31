import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { buildDetailPagePublicSample } from "../lib/product/detailPagePublicSample.js";
import { inspectDetailPageWebUi } from "../lib/qa/detailPageWebUiGuard.js";
import { evaluateDetailPageCanvasQuality } from "../lib/qa/detailPageCanvasQuality.js";
import { buildRiceCanvasStory } from "../lib/product/detailPageCanvasStory.js";

const rice = buildDetailPagePublicSample("open-rice");
const html = rice.html;
const web = inspectDetailPageWebUi(html);
const story = buildRiceCanvasStory(rice.pack, rice.shots);
const quality = evaluateDetailPageCanvasQuality(story, html);

assert.ok(html.includes('data-renderer="detail-canvas"'));
assert.equal((html.match(/data-canvas="/g) || []).length, 9);
assert.deepEqual(
  story.frames.map((f) => f.beat),
  ["hook", "info", "listing", "ingredient", "material", "spec", "package", "shipping", "notice"]
);
assert.equal(new Set(story.frames.map((f) => f.composition)).size >= 8, true);
assert.ok(html.includes('data-mall-beat="hook"'));
assert.ok(html.includes('data-mall-beat="listing"'));
assert.equal(html.includes("한 끼가 된다"), false);
assert.equal(html.includes("씻고, 앉힌다"), false);
assert.equal(html.includes("<button"), false);
assert.equal(html.includes("<nav"), false);
assert.equal(html.includes("<table"), false);
assert.equal(html.includes("<dl"), false);
assert.equal(html.includes("border-radius:999px"), false);
assert.ok(web.webUiFeel <= 15, `web_ui_feel ${web.webUiFeel}`);
assert.ok(quality.ok, `canvas quality fail ${quality.failNs.join(",")}`);
assert.ok(html.includes("/detail-sample/open-rice-canvas-meal.png"));
assert.ok(html.includes("오늘 도정한 쌀"));
assert.ok(existsSync("public/detail-sample/open-rice-canvas-meal.png"));
assert.ok(existsSync("public/detail-sample/open-rice-canvas-finale.png"));

const beans = buildDetailPagePublicSample("open-beans");
assert.ok(beans.html.includes('data-renderer="detail-canvas"'));
assert.ok(beans.html.includes("14,500"));
assert.equal(beans.html.includes("<button"), false);

console.log(
  `ok detail-page-canvas rice=${quality.sections.length} web=${web.webUiFeel} beans=${beans.success.score}`
);
