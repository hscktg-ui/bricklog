/**
 * 조사 팩트 + 화자 → 플레이스·인스타 채널 폴백 회귀
 */
import {
  buildResearchGroundedPlacePack,
  buildResearchGroundedInstagramPack,
  weaveResearchFactsIntoChannelPack,
  hasUsableResearchFacts,
} from "../lib/content/researchGroundedHumanPack.js";
import { getChannelFullText } from "../lib/content/channelPack.js";
import { isChannelPackDeliverable } from "../lib/content/channelPack.js";
import { buildDeliverableChannelFallback } from "../lib/llm/channelDeliveryFallback.js";

process.env.BRICLOG_MISSION = "true";

const petCafeInput = {
  brandName: "플레르퍼피",
  region: "파주",
  topic: "애견카페 플레르퍼피 다녀왔어요",
  purposeType: "visit",
  v4Speaker: "plain_review",
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

const place = buildResearchGroundedPlacePack(petCafeInput);
if (!place._meta?.researchGroundedChannelPack) {
  console.error("FAIL: place pack should be research-grounded");
  process.exit(1);
}
if (!isChannelPackDeliverable("place", place)) {
  console.error("FAIL: place pack not deliverable", place);
  process.exit(1);
}
const placeFull = getChannelFullText(place, "place");
if (!/직접|다녀|확인/.test(placeFull)) {
  console.error("FAIL: place visit voice missing");
  process.exit(1);
}

const insta = buildResearchGroundedInstagramPack(petCafeInput, "emotional");
if (!insta._meta?.researchGroundedChannelPack) {
  console.error("FAIL: instagram pack should be research-grounded");
  process.exit(1);
}
if (!isChannelPackDeliverable("instagram", insta)) {
  console.error("FAIL: instagram pack not deliverable", insta);
  process.exit(1);
}
const instaFull = getChannelFullText(insta, "instagram");
if (!/직접|확인|다녀/.test(instaFull)) {
  console.error("FAIL: instagram visit voice missing");
  process.exit(1);
}

const thinPlace = { title: "플레르퍼피", shortNotice: "안내", detailBody: "간단 안내." };
const woven = weaveResearchFactsIntoChannelPack(thinPlace, "place", petCafeInput);
if (!woven._meta?.researchFactsWoven && woven.detailBody === thinPlace.detailBody) {
  console.error("FAIL: weave should enrich thin place pack");
  process.exit(1);
}

const fallback = buildDeliverableChannelFallback("place", {
  input: petCafeInput,
  failures: ["llm_timeout"],
});
if (!fallback.pack || fallback.source !== "research_grounded_place") {
  console.error("FAIL: channel fallback should use research pack", fallback.source);
  process.exit(1);
}

console.log("OK research-channel-pack");
console.log("  place chars:", placeFull.replace(/\s/g, "").length);
console.log("  insta chars:", instaFull.replace(/\s/g, "").length);
console.log("  fallback source:", fallback.source);
