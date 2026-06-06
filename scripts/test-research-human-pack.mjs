/**
 * 조사 팩트 + 화자 → 사람 칼럼 회귀
 */
import {
  buildResearchGroundedHumanPack,
  hasUsableResearchFacts,
  assertResearchPersonaGrounding,
} from "../lib/content/researchGroundedHumanPack.js";
import { assessHumanWritingDelivery } from "../lib/product/humanWritingDeliveryGate.js";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { scoreChecklistVoice } from "../lib/product/checklistVoiceEngine.js";

process.env.BRICLOG_MISSION = "true";

const petCafeInput = {
  brandName: "플레르퍼피",
  region: "파주",
  topic: "애견카페 플레르퍼피 다녀왔어요",
  purposeType: "visit",
  v4Speaker: "plain_review",
  blogLengthTier: "short",
  researchFacts: [
    { axis: "brand", fact: "실내 대형견·소형견 구역이 분리되어 있음" },
    { axis: "brand", fact: "견주 음료와 반려견 간식 메뉴가 따로 있음" },
    { axis: "region", fact: "파주 운정·교하 일대 주말 방문객이 많음" },
    { axis: "topic", fact: "예약 없이 당일 입장 가능하나 혼잡 시 대기" },
    { axis: "topic", fact: "주차장이 매장 앞에 10대 규모" },
  ],
};

if (!hasUsableResearchFacts(petCafeInput)) {
  console.error("FAIL: should detect usable research facts");
  process.exit(1);
}

const pack = buildResearchGroundedHumanPack(petCafeInput);
const full = getBlogFullText(pack);

if (!pack._meta?.researchGroundedHumanPack) {
  console.error("FAIL: pack should be research-grounded");
  process.exit(1);
}

const infoPads = [/성분·보관/, /알아보게\s*된\s*이유/, /체크\s*포인트/];
for (const re of infoPads) {
  if (re.test(full)) {
    console.error(`FAIL: template pad leaked: ${re}`);
    process.exit(1);
  }
}

if (!/직접|다녀|확인|현장|들었/.test(full)) {
  console.error("FAIL: visit/speaker voice missing");
  console.error(full.slice(0, 400));
  process.exit(1);
}

let factEcho = 0;
for (const f of petCafeInput.researchFacts) {
  const anchor = f.fact.slice(0, 8);
  if (full.includes(f.fact) || full.includes(anchor)) factEcho += 1;
}
if (factEcho < 2) {
  console.error("FAIL: research facts not echoed in body", factEcho);
  process.exit(1);
}

const grounding = assertResearchPersonaGrounding(pack, petCafeInput);
if (!grounding.ok) {
  console.error("FAIL: persona/research grounding", grounding);
  process.exit(1);
}

const checklist = scoreChecklistVoice(full, pack);
if (!checklist.ok) {
  console.error("FAIL: checklist voice", checklist.issues);
  process.exit(1);
}

const assess = assessHumanWritingDelivery(pack, petCafeInput);
if (!assess.humanReady) {
  console.error("FAIL: research pack should pass human gate", assess.reasons);
  process.exit(1);
}

console.log("OK research-human-pack");
console.log("  sections:", pack.sections?.length);
console.log("  chars:", full.replace(/\s/g, "").length);
console.log("  factEcho:", factEcho);
