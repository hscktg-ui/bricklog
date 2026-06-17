/**
 * Human prose delivery — list dump repair + explain/experience repair
 */
import { applyHumanProseDeliveryPass, assessHumanProseDelivery } from "../lib/content/humanProseDeliveryEngine.js";
import { applyExplainRepairToPack } from "../lib/product/briclogExplainEngine.js";
import { applyExperienceRepairToPack } from "../lib/product/briclogExperienceOpinionEngine.js";
import { isDryFactSentence } from "../lib/product/briclogExperienceOpinionEngine.js";
import { isHollowInfoSentence } from "../lib/product/briclogExplainEngine.js";

process.env.BRICLOG_MISSION = "true";
process.env.BRICLOG_RESET_QUALITY = "true";
process.env.BRICLOG_EXPLAIN_V3 = "true";
process.env.BRICLOG_EXPERIENCE_OPINION = "true";

const input = {
  brandName: "모카 브루",
  topic: "원두 추천",
  region: "성수",
};

const listDumpPack = {
  title: "성수 원두 추천",
  sections: [
    {
      heading: "고를 때",
      body: "- 산미가 선명한 블렌드\n- 묵직한 바디감\n- 디카페인 옵션",
    },
    {
      heading: "매장",
      body: "모카 브루는 원두 특징입니다. 조절할 수 있습니다.",
    },
  ],
};

let failed = 0;
function assert(label, cond) {
  if (!cond) {
    console.error("FAIL:", label);
    failed += 1;
  } else {
    console.log("OK:", label);
  }
}

const repairedExplain = applyExplainRepairToPack(listDumpPack, input);
const expRepaired = applyExperienceRepairToPack(repairedExplain, input);
const dryBody = expRepaired.sections[1]?.body || "";
assert(
  "experience repair removes dry spec-only tone",
  !isDryFactSentence(dryBody) || /직접|실제|느껴|확인/.test(dryBody)
);

const prose = applyHumanProseDeliveryPass(expRepaired, input);
const full = (prose.sections || [])
  .map((s) => s.body)
  .join("\n\n");
assert("list dump converted to flowing prose", !/^-\s/m.test(full));
assert("human prose pass stamped", prose._meta?.humanProseDeliveryPass === true);

const assessed = assessHumanProseDelivery(prose, input);
assert("human prose assessment ok", assessed.ok === true);

const hollowPack = {
  sections: [{ heading: "소개", body: "정리해 보았습니다. 좋은 선택이 될 수 있습니다." }],
};
const fixed = applyExplainRepairToPack(hollowPack, input);
const fixedBody = fixed.sections[0]?.body || "";
assert(
  "hollow lines replaced with explain axis",
  fixedBody.length > 20 && /왜|이유|때문|기준|실제|고를/.test(fixedBody)
);

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}

console.log("\nPASS: human prose delivery");
