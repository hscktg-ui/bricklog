import assert from "node:assert/strict";
import {
  REGEN_PANEL_COPY,
  REGEN_TONE_QUICK_PICKS,
  mergeToneQuickPick,
  regenCountLabel,
} from "../lib/product/regenToneUx.js";

assert.ok(REGEN_PANEL_COPY.blog.title);
assert.ok(REGEN_PANEL_COPY.place.titleMobile);
assert.equal(REGEN_TONE_QUICK_PICKS.blog.length, 4);

assert.equal(mergeToneQuickPick("", "짧게"), "짧게");
assert.equal(mergeToneQuickPick("담백하게", "짧게"), "담백하게 · 짧게");
assert.equal(mergeToneQuickPick("담백하게", "담백하게"), "담백하게");

assert.equal(regenCountLabel(0), "");
assert.match(regenCountLabel(2), /2번/);

console.log("OK: regen-tone-ux");
