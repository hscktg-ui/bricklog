/**
 * MASTER REBUILD 2026 — 파이프라인 SSOT 회귀
 */
import assert from "node:assert/strict";
import {
  isUnverifiedClaimSentence,
  stripUnverifiedClaimsFromPack,
  UNVERIFIED_CLAIM_BAN_RES,
} from "@/lib/product/briclogFactFirstEngine.js";
import { isDeletableSentence } from "@/lib/product/briclogDeleteEngine.js";
import {
  applyMasterRebuildPostWritePass,
  isBriclogMasterRebuildEnforced,
  isBriclogAlwaysDeliverEnabled,
  runMasterRebuildQualityGate,
  shouldBlockWriteFirstEscape,
} from "@/lib/product/briclogMasterRebuildPipeline.js";
import { allowsMissionProseDespiteThinResearch } from "@/lib/product/missionProseRouteFlags.js";
import { loadEvaluateFirstContext } from "@/lib/product/briclogEvaluateFirstPipeline.js";
import { assessContentEvaluation } from "@/lib/product/contentEvaluationEngine.js";

const prevReset = process.env.BRICLOG_RESET_QUALITY;
const prevMaster = process.env.BRICLOG_MASTER_REBUILD;
const prevMax = process.env.BRICLOG_MAX_QUALITY;
process.env.BRICLOG_RESET_QUALITY = "true";
process.env.BRICLOG_MASTER_REBUILD = "true";
process.env.BRICLOG_MAX_QUALITY = "false";

assert.ok(isBriclogMasterRebuildEnforced(), "master rebuild enforced");
assert.ok(isBriclogAlwaysDeliverEnabled(), "always deliver enabled");

assert.ok(
  isUnverifiedClaimSentence("수국 꽃다발 문의가 많은 편입니다."),
  "unverified claim detected"
);
assert.ok(
  !isUnverifiedClaimSentence("24시간 무인 매장에서 만원대 꽃다발을 픽업할 수 있습니다."),
  "concrete fact allowed"
);

const dirtyPack = {
  title: "테스트",
  sections: [
    {
      heading: "정리",
      body: "확인해 보았습니다. 수국 꽃다발 문의가 많은 편입니다. 24시간 무인 매장에서 만원대 꽃다발을 픽업할 수 있습니다.",
    },
    {
      heading: "비교",
      body: "해바라기는 밝은 색감이 특징이라 축하 꽃다발에 활용하기 좋습니다.",
    },
    {
      heading: "마무리",
      body: "방문 전 주차는 매장 안내를 기준으로 확인하면 됩니다.",
    },
  ],
  _meta: { llmGenerated: true },
};

const input = {
  brandName: "그랩앤고플라워",
  region: "운정",
  topic: "여름철 꽃 추천",
  industry: "flower",
  storeFeatures: "24시간 무인",
};

const cleaned = applyMasterRebuildPostWritePass(dirtyPack, input, { force: true });
const full = cleaned.sections.map((s) => s.body).join("\n");
assert.ok(!/확인해\s*보았/.test(full), "delete engine removed filler");
assert.ok(!/문의가\s*많/.test(full), "fact-first stripped unverified claim");
assert.ok(/24\s*시간\s*무인/.test(full), "concrete fact preserved");
assert.ok(cleaned._meta?.masterRebuildPostWrite, "master rebuild meta stamped");

const gate = runMasterRebuildQualityGate(dirtyPack, input, { force: true });
assert.equal(gate.withheld, false, "never withhold when body exists");
assert.ok(gate.outputAllowed, "always deliver output");

const evalCtx = loadEvaluateFirstContext(input);
assert.ok(evalCtx.evaluateFirst, "evaluate-first context loaded");
assert.ok(evalCtx.steps.length >= 7, "pre-write steps populated");

assert.equal(
  allowsMissionProseDespiteThinResearch(input),
  false,
  "thin research mission bypass blocked"
);

const softPassPack = {
  sections: [{ heading: "a", body: "본문 테스트입니다." }],
  _meta: { llmGenerated: true, softPass: true, passOutput: false, contentEvaluation: { score: 72 } },
};
assert.equal(
  shouldBlockWriteFirstEscape(softPassPack, input),
  false,
  "always deliver — never block soft pass escape"
);

const badEval = assessContentEvaluation(
  {
    ...dirtyPack,
    sections: [
      {
        heading: "x",
        body: "수국 꽃다발 문의가 많은 편입니다. 인기가 많아요.",
      },
    ],
  },
  input
);
assert.ok(
  badEval.hardReasons.includes("unverified_claim"),
  "eval flags unverified claims"
);
assert.equal(badEval.shouldWithhold, false, "always deliver — never withhold on score");

for (const [re, sample] of [
  [UNVERIFIED_CLAIM_BAN_RES[0], "수국 꽃다발 문의가 많은 편입니다"],
  [UNVERIFIED_CLAIM_BAN_RES[1], "인기가 많아요"],
  [UNVERIFIED_CLAIM_BAN_RES[2], "많이 찾는 편입니다"],
  [UNVERIFIED_CLAIM_BAN_RES[3], "많이 선택하는 경우가 있습니다"],
]) {
  assert.ok(re.test(sample), `ban pattern active: ${re}`);
}

assert.ok(
  isDeletableSentence("확인해 보았습니다.", { brand: "그랩앤고" }),
  "delete engine catches filler"
);

if (prevReset === undefined) delete process.env.BRICLOG_RESET_QUALITY;
else process.env.BRICLOG_RESET_QUALITY = prevReset;
if (prevMaster === undefined) delete process.env.BRICLOG_MASTER_REBUILD;
else process.env.BRICLOG_MASTER_REBUILD = prevMaster;
if (prevMax === undefined) delete process.env.BRICLOG_MAX_QUALITY;
else process.env.BRICLOG_MAX_QUALITY = prevMax;

console.log("OK: master rebuild 2026 — always deliver, fact-first, delete, no withhold");
