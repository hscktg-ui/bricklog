/**
 * Core Quality Engine — heuristic cases + target score wiring
 * Run: node scripts/test-quality-cases.mjs
 */

import { CONSTITUTION_V2_TARGET_SCORE } from "../lib/constitution/constitutionThresholds.js";
import {
  CORE_TARGET_SCORE,
  CORE_MAX_REWRITES,
} from "../lib/quality/coreQualityEngine.js";
import { DEFAULT_QUALITY_TARGET } from "../lib/quality/qualityDefaults.js";
import { resolveBlogLengthTier } from "../lib/constants.js";
import {
  resolveWritingSkillLevel,
  WRITING_SKILL_LEVEL_OPTIONS,
} from "../lib/content/writingSkillLevel.js";
import {
  scoreLengthTierCompliance,
  FILLER_PADDING_PATTERNS,
} from "../lib/content/humanDeliveryRules.js";

assert(CORE_TARGET_SCORE === 95, "CORE_TARGET_SCORE must be 95");
assert(DEFAULT_QUALITY_TARGET === 95, "DEFAULT_QUALITY_TARGET must be 95");
assert(CONSTITUTION_V2_TARGET_SCORE === 95, "CONSTITUTION_V2_TARGET_SCORE must be 95");
assert(
  CORE_MAX_REWRITES >= 1,
  `CORE_MAX_REWRITES should allow quality loop (got ${CORE_MAX_REWRITES}; fast pipeline caps at 1–2)`
);

const PLACEHOLDER_RE =
  /\b(undefined|null|NaN|placeholder|TODO|FIXME|lorem)\b|좋은내용|브랜드명|지역명|제목|내용|입력값|예시|\{\{|\}\}|\[브랜드\]|\[지역\]|\[내용\]/i;

const CLICHES = ["특별한 경험", "소중한 순간", "감동을 선사하다"];
const FAKE_LOCS = ["서울", "강남", "파주", "제주"];

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// 1 placeholder
assert(PLACEHOLDER_RE.test("좋은내용"), "case1 placeholder regex");

// 2 cliché count
const text2 = "특별한 경험과 소중한 순간, 감동을 선사하다.";
let clicheN = 0;
for (const p of CLICHES) if (text2.includes(p)) clicheN++;
assert(clicheN >= 2, "case2 cliché density");

// 3 tone mix (습니다 vs 해요)
const t3 = "했어요. 더라고요. 같아요. 했는데요. 좋아요.";
const haeyo = (t3.match(/했어요|더라고요|같아요|했는데요/g) || []).length;
const seumnida = (t3.match(/습니다|입니다/g) || []).length;
assert(haeyo >= 3 && seumnida === 0, "case3 informal-only in formal context");

// 4 fake location + topic drift tokens
const t4 = "서울 강남 카페 이야기 제주 여행";
assert(FAKE_LOCS.some((l) => t4.includes(l)), "case4 location marker");
const topicTokens = ["파주", "카페"];
const hits = topicTokens.filter((k) => t4.includes(k)).length;
const ratio = hits / topicTokens.length;
assert(ratio < 0.7, "case4 topic drift ratio");

// 5 layout command in wrong field should not become topic anchor
const LAYOUT_RE = /\d+\s*번째\s*(문단|섹션|소제목|단락|부분)/;
const wrongMain = "3번째 소제목에 할인 넣어줘";
const realTopic = "어버이날 꽃다발 예약이 늘었어요";
assert(LAYOUT_RE.test(wrongMain), "case5 layout regex");
assert(!LAYOUT_RE.test(realTopic), "case5 topic is content not layout");
const briefBlob = `핵심 이야기: ${realTopic}`;
assert(
  briefBlob.includes("어버이날") && briefBlob.includes("꽃다발"),
  "case5 canonical brief anchors real story"
);

// 6 length tier bands (V20)
const short = resolveBlogLengthTier("short");
const med = resolveBlogLengthTier("medium");
const long = resolveBlogLengthTier("long");
assert(short.min === 1800 && short.max === 2200, "short tier band");
assert(med.min === 2800 && med.max === 3200, "medium tier band");
assert(long.min === 3800 && long.max === 5000, "long tier band");

// 7 writing skill → proficiency
const civilian = resolveWritingSkillLevel({ writingSkillLevel: "civilian" });
assert(civilian.proficiency === "general", "civilian maps general");
const pro = resolveWritingSkillLevel({ writingSkillLevel: "pro" });
assert(pro.proficiency === "writer_pro", "pro maps writer_pro");
assert(WRITING_SKILL_LEVEL_OPTIONS.length === 3, "three skill tiers");

// 8 filler padding detect
const fillerText = "많은 분들이 참고하시기 바랍니다. 이러한 점에서 도움이 되시길.";
assert(
  FILLER_PADDING_PATTERNS.some((re) => re.test(fillerText)),
  "filler regex"
);

// 9 tier under mock
const underPack = {
  sections: [{ heading: "a", body: "짧은 본문." }],
  conclusion: "",
};
const under = scoreLengthTierCompliance(underPack, {
  input: { blogLengthTier: "medium" },
  blogLengthTier: "medium",
});
assert(under.reasons.includes("length_tier_under"), "tier under detected");

console.log(
  `OK — quality heuristics + targets (95, max rewrites ${CORE_MAX_REWRITES})`
);
