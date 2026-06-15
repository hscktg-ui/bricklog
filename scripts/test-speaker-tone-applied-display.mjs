/**
 * 화자·톤앤매너 선택 vs 적용 — UI 표시·엔진 정렬 회귀
 */
import assert from "node:assert/strict";
import { buildMissionProseFallbackPack } from "../lib/llm/missionProseFallback.js";
import { finalizeContentQualityForDelivery } from "../lib/product/contentQualityDelivery.js";
import {
  buildSpeakerToneAppliedSummary,
  buildSpeakerToneAppliedChips,
} from "../lib/product/speakerToneAppliedDisplay.js";
import {
  buildEditorialReflectionChips,
  buildEditorialReflectionSnapshot,
} from "../lib/product/editorialReflectionDisplay.js";
import { buildWorkspaceContextScore } from "../lib/publicTest/briclogContextScore.js";
import { buildManuscriptStatusLines } from "../lib/product/publishUiDisplay.js";

process.env.BRICLOG_MISSION = "true";

const brandIntroInput = {
  brandName: "그랩앤고플라워",
  region: "파주 운정",
  topic: "여름 꽃 추천",
  industry: "꽃집",
  v4Speaker: "brand_intro",
  speechStyle: "brand_official",
  emotionTemperature: "trust",
  styleContinuityBrief: "담백하고 신뢰감 있는 매장 안내",
  researchFacts: [{ fact: "수국·해바라기", source: "r" }],
};

const plainReviewInput = {
  ...brandIntroInput,
  topic: "파주 운정 꽃집 방문 후기",
  v4Speaker: "plain_review",
  speechStyle: "review_real",
};

let pack = buildMissionProseFallbackPack(brandIntroInput);
pack = finalizeContentQualityForDelivery(pack, brandIntroInput, "blog");

const summary = buildSpeakerToneAppliedSummary(pack, brandIntroInput);
assert.equal(summary.selected.label, "브랜드 소개형");
assert.ok(summary.applied.label, "applied label required");
assert.equal(summary.speechStyle.label, "브랜드 공식형");
assert.equal(summary.emotion.label, "신뢰감");
assert.ok(summary.brandToneBrief.includes("담백"));
assert.ok(summary.displayLine.includes("문체"));
assert.ok(
  summary.statusHint.includes("브랜드 소개형") ||
    summary.statusHint.includes("반영"),
  summary.statusHint
);

const chips = buildEditorialReflectionChips(pack, brandIntroInput);
assert.ok(chips.some((c) => c.id === "speaker-selected"));
assert.ok(chips.some((c) => c.id === "speech-style"));
assert.ok(chips.some((c) => c.label.includes("브랜드 톤")));

const ctx = buildWorkspaceContextScore(pack, brandIntroInput);
assert.ok(ctx.speakerTone?.displayLine, "workspace context must expose speakerTone");
assert.ok(
  buildManuscriptStatusLines(ctx.axes).some((l) => l.id === "speaker"),
  "status card must include speaker row"
);

assert.ok(pack._meta?.speakerToneApplied?.applied?.label);
assert.ok(pack._meta?.appliedSpeakerLabel);

const reviewPack = finalizeContentQualityForDelivery(
  buildMissionProseFallbackPack(plainReviewInput),
  plainReviewInput,
  "blog"
);
const reviewSummary = buildSpeakerToneAppliedSummary(reviewPack, plainReviewInput);
assert.equal(reviewSummary.selected.label, "담백한 후기형");
assert.equal(reviewSummary.speechStyle.label, "후기형");

const appliedChips = buildSpeakerToneAppliedChips(reviewPack, plainReviewInput);
assert.ok(appliedChips.length >= 3);

const snap = buildEditorialReflectionSnapshot(pack, brandIntroInput);
assert.equal(snap.selectedSpeaker, "브랜드 소개형");
assert.ok(snap.appliedSpeaker);

console.log("OK: speaker tone applied display — selection visible, meta stamped");
