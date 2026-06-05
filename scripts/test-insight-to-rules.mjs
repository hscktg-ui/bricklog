/**
 * Insight → evolution-lab rules 연결
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import {
  applyInsightToEvolutionRules,
  buildEvolutionPatchFromInsight,
} from "@/lib/evolution-lab/insightToRules.js";

const evolvedDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  ".data",
  "evolution-lab",
  "rules"
);

try {
  fs.rmSync(evolvedDir, { recursive: true, force: true });
} catch {
  /* fresh */
}

const patch = buildEvolutionPatchFromInsight({
  insight_type: "ai_cliche_threshold",
  payload: { message: "test insight" },
});
assert.ok(patch?.["prompt_rules.json"]?.forbiddenPhrases?.length);

const applied = applyInsightToEvolutionRules({
  insight_type: "ad_tone_guard",
  payload: { message: "ad tone test" },
});
assert.equal(applied.applied, true);
assert.ok(fs.existsSync(path.join(evolvedDir, "prompt_rules.json")));

const globalInsights = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "lib", "feedback", "globalInsights.js"),
  "utf8"
);
assert.match(globalInsights, /applyInsightToEvolutionRules/);

console.log("OK: insight → evolution-lab rules");
