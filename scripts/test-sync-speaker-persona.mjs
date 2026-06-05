/**
 * v4Speaker ↔ contentPersona 동기화
 */
import assert from "node:assert/strict";
import { applyV4SpeakerToInput } from "../lib/persona/v4Speakers.js";
import {
  applySpeakerPersonaToValues,
  describeLinkedPersona,
  getSpeakerPersonaFields,
  isSpeakerPersonaLocked,
} from "../lib/persona/syncSpeakerPersona.js";
import { normalizeBlogInputIntent } from "../lib/llm/normalizeBlogInputIntent.js";

assert.equal(isSpeakerPersonaLocked("auto"), false);
assert.equal(isSpeakerPersonaLocked("real_use"), true);

const fields = getSpeakerPersonaFields("real_use");
assert.equal(fields.contentPersona, "visit_review");
assert.equal(fields.contentPersonaSubtype, "experience");

const applied = applyV4SpeakerToInput({ v4Speaker: "brand_intro", topic: "테스트" });
assert.equal(applied.contentPersona, "brand_story");
assert.equal(applied.contentPersonaSubtype, "philosophy");

const form = applySpeakerPersonaToValues({ v4Speaker: "column" });
assert.equal(form.contentPersona, "info_intro");
assert.equal(form.contentPersonaSubtype, "compare");

const linked = describeLinkedPersona("local_blogger");
assert.ok(linked?.speakerLabel);
assert.ok(linked?.personaLabel);

const norm = normalizeBlogInputIntent({
  brandName: "더건강하개",
  region: "용인",
  topic: "수제 간식",
  v4Speaker: "real_use",
  contentPersona: "brand_story",
  contentPersonaSubtype: "philosophy",
});
assert.equal(norm.input.contentPersona, "visit_review");
assert.equal(norm.input.contentPersonaSubtype, "experience");
assert.equal(norm.input.personaEngineProfile?.v4Speaker, "real_use");

console.log("OK: sync speaker persona");
