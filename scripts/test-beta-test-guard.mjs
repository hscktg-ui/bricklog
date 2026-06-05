/**
 * BRICLOG Beta Test Guard Engine — 9항 검수 + 출력 차단
 */
import {
  detectBetaTestGuardFailures,
  applyBetaTestGuardCorrections,
  requiresBetaTestGuard,
  BETA_GUARD_CHECKS,
} from "../lib/content/betaTestGuardEngine.js";
import {
  assertBetaTestGuardWithCorrection,
  shouldWithholdFailedPostVerify,
} from "../lib/content/betaTestGuardEngine.js";
import { prepareBriclogPreWriteContext } from "../lib/content/briclogPreWriteContext.js";
import { countBlogBodyCharsWithSpaces } from "../lib/prompts/engine/textUtils.js";
import { isMechanicalListingTitle } from "../lib/content/humanTitleEngine.js";
import { runKnowledgeExpansionPipeline } from "../lib/content/knowledgeExpansionEngine.js";
import { resolveBlogLengthTier } from "../lib/constants.js";
import { applyHumanityFinishPass } from "../lib/content/humanityFinishPass.js";
import { applyV17PostWritePack } from "../lib/content/v17PostProcess.js";
import {
  buildMissionProseFallbackPack,
  deepenMissionProseToMin,
} from "../lib/llm/missionProseFallback.js";

process.env.BRICLOG_MISSION = "true";

console.log("\n=== BETA TEST GUARD ENGINE ===\n");

if (BETA_GUARD_CHECKS.length !== 9) {
  console.error("FAIL: expected 9 checks", BETA_GUARD_CHECKS.length);
  process.exit(1);
}

const leakPack = {
  title: "평택에서 알아두면 좋은 정보",
  representativeTitle: "평택에서 알아두면 좋은 정보",
  sections: [
    {
      heading: "안내",
      body: "이 글은 모션베드에 답하려고 정리했습니다. 브랜드 메모리와 검수 기준을 반영했습니다.",
    },
    { heading: "비교", body: "확인된 정보만 남기고 서술합니다." },
    { heading: "마무리", body: "방문 전 확인하면 도움이 됩니다." },
  ],
  conclusion: "SEO는 결과이며 본문은 informative 톤입니다.",
};

const leak = detectBetaTestGuardFailures(leakPack, "blog", {}, {
  brandName: "템퍼",
  region: "평택",
  topic: "모션베드",
  industry: "가구/침대",
  v2PipelineEnforced: true,
});
if (leak.ok) {
  console.error("FAIL: leak pack should fail internal_prompt_leak");
  process.exit(1);
}
if (!leak.checks.internal_prompt_leak.failures.length) {
  console.error("FAIL: expected leak failures", leak.checks.internal_prompt_leak);
  process.exit(1);
}
console.log("OK: internal prompt leak detected");

const dupPack = {
  title: "꽃다발 고르는 법",
  representativeTitle: "꽃다발 고르는 법",
  sections: [
    {
      heading: "포인트",
      body: "졸업식 꽃다발은 수령 시간을 먼저 확인하세요. 졸업식 꽃다발은 수령 시간을 먼저 확인하세요.",
    },
    { heading: "예약", body: "리본 색은 학교 톤에 맞추면 좋습니다." },
    { heading: "정리", body: "생화 예약은 당일 픽업이 가능한지 물어보세요." },
  ],
  conclusion: "매장에 전화로 재고를 확인하세요.",
};
const dup = detectBetaTestGuardFailures(dupPack, "blog", {}, {
  brandName: "꽃집 노을",
  region: "강릉",
  topic: "졸업식 꽃다발",
  industry: "꽃/플로리스트",
});
if (dup.checks.duplicate_content.ok) {
  console.error("FAIL: duplicate should fail");
  process.exit(1);
}
console.log("OK: duplicate detection");

const crossPack = {
  title: "봄 꽃다발 추천",
  representativeTitle: "봄 꽃다발 추천",
  sections: [
    {
      heading: "선물",
      body: "졸업식에는 생화 예약이 중요합니다. 모션베드 헤드 각도도 함께 비교해 보세요.",
    },
    { heading: "포장", body: "리본 포장 색을 맞추면 좋습니다." },
    { heading: "픽업", body: "당일 수령 가능 여부를 확인하세요." },
  ],
  conclusion: "매장 운영 시간을 확인하세요.",
};
const corrected = applyBetaTestGuardCorrections(crossPack, "blog", {}, {
  brandName: "꽃집",
  region: "강릉",
  topic: "꽃다발",
  industry: "꽃/플로리스트",
});
const crossAfter = detectBetaTestGuardFailures(corrected, "blog", {}, {
  brandName: "꽃집",
  region: "강릉",
  topic: "꽃다발",
  industry: "꽃/플로리스트",
});
if (!crossAfter.checks.industry_fit.ok) {
  console.error("FAIL: industry purge", crossAfter.checks.industry_fit);
  process.exit(1);
}
console.log("OK: cross-industry purge");

const badTitle = "평택 템퍼 모션베드 특별할인";
if (!isMechanicalListingTitle(badTitle, {}, { brandName: "템퍼", region: "평택", topic: "모션베드" })) {
  console.error("FAIL: mechanical title should be detected");
  process.exit(1);
}
console.log("OK: mechanical title rule");

const motionInput = {
  brandName: "에이스침대",
  region: "파주",
  topic: "오피모 전시 소식",
  industry: "가구",
  blogLengthTier: "short",
  contentChannel: "blog",
  v2PipelineEnforced: true,
  v3EngineEnforced: true,
  betaTestGuardEnforced: true,
};

if (!requiresBetaTestGuard(motionInput)) {
  console.error("FAIL: beta guard should be required");
  process.exit(1);
}

const preWrite = prepareBriclogPreWriteContext(motionInput);
const pipelineInput = { ...motionInput, ...preWrite };
runKnowledgeExpansionPipeline(pipelineInput);
const ctx = { brandName: "에이스침대", region: "파주", industryKey: "furniture" };
const shortTier = resolveBlogLengthTier("short");
let pack = buildMissionProseFallbackPack(pipelineInput);
pack = applyV17PostWritePack(pack, { ...ctx, input: pipelineInput }, "blog");
pack = applyHumanityFinishPass(pack, { ...ctx, input: pipelineInput }, "blog");
const chars = countBlogBodyCharsWithSpaces(pack);
if (chars < shortTier.min) {
  console.error("FAIL: mission prose pack below short tier", chars, shortTier.min);
  process.exit(1);
}

const betaGate = assertBetaTestGuardWithCorrection(
  pack,
  "blog",
  ctx,
  pipelineInput,
  5
);
pack = betaGate.pack;
if (!betaGate.passOutput) {
  const softOnly = (betaGate.failReasons || []).every((r) =>
    ["sentence_similarity_80", "content_quality", "human_review"].includes(r)
  );
  const cqScore = betaGate.checks?.content_quality?.failures?.[0]?.score ?? 0;
  if (softOnly && chars >= shortTier.min && cqScore >= 12) {
    console.log(
      `OK: expanded blog mission fallback (${chars} chars) — soft guard: ${betaGate.failReasons.join(", ")}`
    );
  } else {
    console.error("FAIL: beta guard on expanded pack", betaGate.failReasons);
    if (betaGate.checks) {
      for (const [k, v] of Object.entries(betaGate.checks)) {
        if (!v.ok) console.error("  ", k, v.failures?.slice(0, 2));
      }
    }
    process.exit(1);
  }
} else {
  console.log(`OK: expanded blog beta pass (${chars} chars)`);
}

if (!shouldWithholdFailedPostVerify({ v2PipelineEnforced: true })) {
  console.error("FAIL: should withhold when pipeline enforced");
  process.exit(1);
}
if (shouldWithholdFailedPostVerify({ betaTestGuardEnforced: false, v2PipelineEnforced: false })) {
  console.error("FAIL: should not withhold when guard off");
  process.exit(1);
}
console.log("OK: withhold policy");

console.log("\n=== ALL BETA GUARD TESTS PASSED ===\n");
