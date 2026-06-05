/**
 * 가구·오피모 전시 — 피드백 260604 회귀 (스펙 환각·안내 나열·말투·타브랜드)
 */
process.env.BRICLOG_MISSION = "true";

import assert from "node:assert/strict";
import { applyFurnitureExhibitionPackPolish } from "@/lib/product/furnitureExhibitionEngine.js";
import { polishMissionProsePack } from "@/lib/product/missionProseEngine.js";
import { applyHumanWriterHeadingGate } from "@/lib/content/humanWriterHeadingGate.js";
import { getBlogFullText } from "@/utils/qualityCheck.js";

const input = {
  brandName: "에이스침대",
  region: "파주",
  industry: "가구",
  topic: "오피모 전시 소식",
  blogLengthTier: "medium",
};

const badPack = {
  title: "파주 에이스침대, 오피모 전시 소식에 담긴 이야기 봐야 할 기준",
  sections: [
    {
      heading: "파주 에이스침대, 오피모 전시 소식이 궁금하다면",
      body: "최근 파주 에이스침대에서는 오피모-3를 전시하고 있어요. 체압 분산 기능이 탁월하답니다. 모션 기능이 추가되어 있습니다.",
    },
    {
      heading: "오피모-3의 특징과 기능",
      body: "과장 없이 매장·공식 안내 기준으로만 정리했어요. 오피모-3는 체압 분산 기능을 갖추고 있어 편안한 수면을 제공합니다. 프레임 높이 조절이 가능하여 맞춤형으로 조절할 수 있어요.",
    },
    {
      heading: "방문 시 확인해야 할 점",
      body: "방문 전 예약·주차·체험 가능 여부부터 확인하면 좋아요. 다른 브랜드와의 비교도 손쉽게 할 수 있으니 충분한 시간을 두고 방문하세요.",
    },
    {
      heading: "A/S와 교환 정책",
      body: "침대 구매 후에도 A/S와 교환이 가능하니 안심하고 구매하셔도 됩니다. 고객 만족을 최우선으로 생각합니다.",
    },
  ],
  conclusion: "방문 예약을 통해 더욱 편리하게 매장을 이용하실 수 있습니다.",
};

let pack = applyFurnitureExhibitionPackPolish(badPack, input);
pack = polishMissionProsePack(pack, input);
pack = applyHumanWriterHeadingGate(pack, { input });

const full = getBlogFullText(pack);
const h0 = pack.sections?.[0]?.heading || "";

assert.ok(!/궁금하다면|봐야\s*할\s*기준/.test(h0), `heading: ${h0}`);
assert.ok(/쇼룸|직접\s*본|다녀/.test(h0), `exhibition heading: ${h0}`);
assert.ok(!/체압\s*분산|모션\s*기능|프레임\s*높이\s*조절|맞춤형\s*조절/.test(full));
assert.ok(!/다른\s*브랜드/.test(full));
assert.ok(!/과장\s*없이\s*매장·공식/.test(full));
assert.ok(!/A\/S와\s*교환|방문\s*예약\s*방법/.test(pack.sections.map((s) => s.heading).join(" ")));
assert.ok(!/제공합니다|가능합니다|필요합니다|좋습니다\.|권합니다/.test(full));
assert.ok(/해요|었어요|봤어요|들었어요|다녀/.test(full), "haeyo / field voice");
assert.ok(/>\s/.test(full) || /영업\s*시간|예약|주차/.test(full), "practical blockquote or hint");

console.log("OK: furniture exhibition engine — opimo spec guard, service sections, haeyo, headings");
console.log("  heading[0]:", h0.slice(0, 48));
