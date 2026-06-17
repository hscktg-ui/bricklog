/**
 * BRICLOG NEXT — 이번 달 운영 리듬 스냅샷
 */
import assert from "node:assert/strict";
import {
  buildBriclogNextSnapshot,
  getBriclogNextPublicPitch,
  BRICLOG_NEXT_VERSION,
} from "../lib/product/briclogNext.js";

const input = {
  brandName: "모닝브루",
  region: "서울 강남",
  topic: "봄 브런치 오픈",
  industry: "카페",
};

const fresh = buildBriclogNextSnapshot(input, {
  blog: true,
  place: false,
  insta: false,
  blogTopic: "봄 브런치 오픈",
});

assert.equal(fresh.version, BRICLOG_NEXT_VERSION);
assert.ok(fresh.ok);
assert.equal(fresh.doneCount, 1);
assert.equal(fresh.progress, 33);
assert.ok(fresh.primaryAction?.channel === "place");
assert.ok(fresh.steps.some((s) => s.channel === "place"));

const complete = buildBriclogNextSnapshot(input, {
  blog: true,
  place: true,
  insta: true,
  blogTopic: input.topic,
});

assert.equal(complete.doneCount, 3);
assert.equal(complete.progress, 100);

const preBlog = buildBriclogNextSnapshot(input, {
  blog: false,
  place: false,
  insta: false,
});
assert.ok(preBlog.ok);
assert.equal(preBlog.progress, 0);

const pitch = getBriclogNextPublicPitch();
assert.ok(pitch.headline.includes("이번 달"));
assert.equal(pitch.pillars.length, 3);

console.log("OK: briclog-next", {
  progress: fresh.progress,
  primary: fresh.primaryAction?.channelLabel,
  pitch: pitch.eyebrow,
});
