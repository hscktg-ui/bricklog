/**
 * Council 브리프 3케이스 — 엔진 축 회귀 (업종 패치 아님)
 * Run: npm run test:council-brief
 * @see docs/COUNCIL_BRIEF.md
 */
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { recommendContentPerspective } from "../lib/content/perspectiveEngine.js";
import { recommendContentPersona } from "../lib/persona/contentPersona.js";
import { detectContentIntent } from "../lib/pipeline/v2/intentDetection.js";
import { resolveWritingContract } from "../lib/content/writingContract.js";
import { deriveTopicWritingContext } from "../lib/content/topicFacetEngine.js";
import { buildMissionExperienceCatalog } from "../lib/product/missionProseEngine.js";
import {
  COUNCIL_BRIEF_CASES,
  COUNCIL_BRIEF_VERSION,
  COUNCIL_MISSION_VISIT_RE,
  inferCouncilAxisTag,
} from "../lib/council/councilBriefCases.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function evaluateCase(brief) {
  const { input, expect, id, label } = brief;
  const contract = resolveWritingContract(input);
  const persona = recommendContentPersona(input);
  const perspective = recommendContentPerspective(input);
  const intent = detectContentIntent({
    topic: input.topic,
    brandName: input.brandName,
    region: input.region,
    industry: input.industry,
  });
  const p = deriveTopicWritingContext(input);
  const mission = buildMissionExperienceCatalog(p, input, []);
  const missionText = mission.join(" ");

  const contractWrong =
    !expect.contractTypes.includes(contract.type) ||
    contract.density !== expect.density ||
    contract.visitToneAllowed !== expect.visitToneAllowed;
  const visitLeak = expect.missionVisitForbidden && COUNCIL_MISSION_VISIT_RE.test(missionText);
  const segmentMissing = expect.density === "segmented" && contract.density !== "segmented";
  const personaWrong = persona.persona !== expect.persona;
  const perspectiveWrong = perspective !== expect.perspective;
  const missionHintsMiss =
    expect.missionHints?.length &&
    !expect.missionHints.some((re) => re.test(missionText));

  const axisTag = inferCouncilAxisTag({
    contractWrong,
    visitLeak,
    segmentMissing,
    macroOnly: false,
  });

  const deliverable =
    !contractWrong &&
    !visitLeak &&
    !personaWrong &&
    !perspectiveWrong &&
    !missionHintsMiss;

  return {
    id,
    label,
    deliverable,
    axisTag,
    contract: {
      type: contract.type,
      density: contract.density,
      visitToneAllowed: contract.visitToneAllowed,
      label: contract.label,
    },
    persona: persona.persona,
    perspective,
    intent: intent.locked,
    missionSample: mission.slice(0, 2),
    failures: [
      contractWrong && `contract_wrong:${contract.type}/${contract.density}`,
      visitLeak && "visit_leak:mission",
      personaWrong && `persona:${persona.persona}`,
      perspectiveWrong && `perspective:${perspective}`,
      missionHintsMiss && "macro_only:mission_hints",
    ].filter(Boolean),
  };
}

const results = COUNCIL_BRIEF_CASES.map(evaluateCase);
const pass = results.filter((r) => r.deliverable).length;
const summary = {
  version: COUNCIL_BRIEF_VERSION,
  at: new Date().toISOString(),
  total: results.length,
  pass,
  passRate: Math.round((pass / results.length) * 100),
  northStar:
    "네이버·플레이스·인스타 붙여넣기 가능 + 이번 달 운영 계획에 기여",
  results,
};

const outDir = join(root, "artifacts", "council-brief");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "latest-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);

const failed = results.filter((r) => !r.deliverable);
if (failed.length) {
  console.error("FAIL council-brief:", failed.map((r) => `${r.id}:${r.failures.join(",")}`).join(" | "));
  console.log(JSON.stringify(summary, null, 2));
  process.exit(1);
}

console.log("OK council-brief (3 cases)");
for (const r of results) {
  console.log(
    `  Case ${r.id} ${r.contract.label} · ${r.contract.density} · mission:${r.missionSample[0]?.slice(0, 48)}…`
  );
}
console.log(`Report: ${join(outDir, "latest-summary.json")}`);
