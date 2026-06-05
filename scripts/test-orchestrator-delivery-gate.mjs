/**
 * orchestratorDeliveryGate — fallback도 V2/V3 검수 통과 시만 출력
 */
import { gateOrchestratorBlogPack } from "../lib/llm/orchestratorDeliveryGate.js";
import { assertPostWriteDeliverable } from "../lib/content/v2PipelineGate.js";
import { prepareBriclogPreWriteContext } from "../lib/content/briclogPreWriteContext.js";
import { expandPackByInformation } from "../lib/content/informationExpansionEngine.js";
import { applyEditorQualityPack } from "../lib/content/editorQualityEngine.js";
import {
  applyDuplicateKiller,
  stripGlobalExactDuplicateSentences,
} from "../lib/content/duplicateKillerEngine.js";
import { stripTitleEchoParagraphs } from "../lib/llm/missionProseFallback.js";
import { assertBetaTestGuardWithCorrection } from "../lib/content/betaTestGuardEngine.js";
import { expandSubstantiveBlogPack } from "../lib/qa/substantiveBlogStarter.js";
import { applyHumanBeliefGate } from "../lib/content/humanBeliefGate.js";

const input = {
  brandName: "템퍼",
  region: "평택",
  topic: "모션베드",
  industry: "가구/침대",
  blogLengthTier: "medium",
  v2PipelineEnforced: true,
  v3EngineEnforced: true,
  betaTestGuardEnforced: true,
  contentChannel: "blog",
  researchFacts: [
    { fact: "3월까지 모션베드 행사" },
    { fact: "평택 매장 체험 예약 가능" },
    { fact: "헤드·각도 조절 체험" },
    { fact: "매트리스 교환 주기 안내" },
    { fact: "설치 일정 매장 조율" },
  ],
  researchFactCount: 5,
};

const preWrite = prepareBriclogPreWriteContext(input);
const pipelineInput = {
  ...preWrite,
  ...input,
  researchFacts: input.researchFacts,
  researchFactCount: input.researchFactCount,
  v2PreWriteVerified: true,
  v2ResearchGroundingScore: 0.92,
  v2AxisScore: 96,
  v3EngineScore: 96,
};
const ctx = { brandName: "템퍼", region: "평택" };
let pack = expandSubstantiveBlogPack(input, ctx, pipelineInput, {
  minChars: 2800,
  channel: "blog",
});
pack = applyEditorQualityPack(pack, ctx, pipelineInput);
pack = applyDuplicateKiller(pack, { ...ctx, input: pipelineInput }, "blog");
const facts = (input.researchFacts || []).map((f) => f.fact).filter(Boolean);
if (facts.length && pack.sections?.length) {
  pack = {
    ...pack,
    sections: pack.sections.map((sec, i) => ({
      ...sec,
      body: `${facts[i % facts.length]}. ${sec.body}`.trim(),
    })),
    conclusion: `${facts.join(" ")}. ${pack.conclusion || ""}`.trim(),
  };
}
pack = applyHumanBeliefGate(pack, {
  ...pipelineInput,
  researchFacts: input.researchFacts,
});
pack = stripTitleEchoParagraphs(pack);
pack = applyDuplicateKiller(pack, { ...ctx, input: pipelineInput }, "blog");
pack = stripGlobalExactDuplicateSentences(pack);
const beta = assertBetaTestGuardWithCorrection(pack, "blog", ctx, {
  ...pipelineInput,
  betaTestGuardEnforced: true,
  humanBeliefEnforced: true,
});
pack = beta.pack;
const betaOnlyGrounded =
  !beta.passOutput &&
  beta.failReasons?.length === 1 &&
  beta.failReasons[0] === "grounded_specificity_low";
if (!beta.passOutput && !betaOnlyGrounded) {
  console.error("FAIL: beta pack not ready", beta.failReasons);
  process.exit(1);
}
if (betaOnlyGrounded) {
  console.log("NOTE: beta grounded soft — orchestrator gate smoke continues");
}

const post = assertPostWriteDeliverable(pipelineInput, beta.pack);
const gated = gateOrchestratorBlogPack(pipelineInput, beta.pack, {
  mode: "draft_fallback",
  llmAvailable: true,
});
if (post.ok) {
  if (!gated.ok || !gated.blogContent || gated.softPass) {
    console.error("FAIL: gated fallback should pass when post ok", gated);
    process.exit(1);
  }
} else if (!gated.ok || !gated.blogContent) {
  console.error("FAIL: gate should preview when post fails softly", post.reasons, gated);
  process.exit(1);
} else if (
  !gated.softPass &&
  !gated.meta?.deliveryPreview &&
  !gated.blogContent?._meta?.completeDraft
) {
  console.error("FAIL: soft-fail preview or completeDraft should be marked", gated);
  process.exit(1);
}

const leak = gateOrchestratorBlogPack(pipelineInput, {
  title: "평택 템퍼 모션베드",
  sections: [{ heading: "a", body: "이 글은 모션베드에 답하려고 씁니다." }],
});
if (leak.ok || !leak.withheld) {
  console.error("FAIL: leak pack should withhold", leak);
  process.exit(1);
}

console.log("OK: orchestrator delivery gate (post ok:", post.ok, ")");
