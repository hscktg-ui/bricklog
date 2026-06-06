/**
 * 사람이 쓴 것 같은 글 — 배달 게이트 회귀
 */
import { buildMissionProseFallbackPack } from "../lib/llm/missionProseFallback.js";
import { applyCoreContentEngineGate } from "../lib/product/coreContentEngine.js";
import {
  assessHumanWritingDelivery,
  shouldWithholdHumanWritingPack,
} from "../lib/product/humanWritingDeliveryGate.js";
import { deliverBlogDespiteGate } from "../lib/product/deliverySoftPass.js";
import { isPreviewWithholdFailure } from "../lib/product/completionStandard.js";

process.env.BRICLOG_MISSION = "true";

const complaintInput = {
  brandName: "플레르퍼피",
  region: "파주",
  topic: "애견카페 플레르퍼피 다녀왔어요",
  purposeType: "visit",
  blogLengthTier: "short",
};

const badPack = {
  title: "파주 플레르퍼피 애견카페 플레르퍼피 다녀왔어요",
  sections: [
    {
      heading: "왜 애견카페 플레르퍼피 다녀왔어요를 찾게 되는가",
      body:
        "카공·모임 자리를 잡을 때는 좌석·콘센트부터 먼저 걱정되는 경우가 많다.\n\n애견카페 플레르퍼피 다녀왔어요를 고를 때 성분·보관·목적을 함께 보면 기준이 분명해집니다.",
    },
    {
      heading: "애견카페 플레르퍼피 다녀왔어요, 알아보게 된 이유",
      body:
        "선물·반려·집에서 먹기 등 용도별로 애견카페 플레르퍼피 다녀왔어요 기준이 달라질 수 있어요.\n\n비슷한 제품을 비교할 때는 첨가물·알레르기 표기를 나란히 보면 수월해요.",
    },
    {
      heading: "애견카페 플레르퍼피 다녀왔어요 고를 때 체크 포인트",
      body: "브런치 메뉴를 찾다 보면 분위기와 가격 사이에서 막히는 날이 있다.",
    },
  ],
  conclusion:
    "파주 플레르퍼피 애견카페 플레르퍼피 다녀왔어요 — 성분·보관·선물 목적을 함께 보면 선택이 수월해요.",
  _meta: { missionProseFallback: true },
};

const badAssess = assessHumanWritingDelivery(badPack, complaintInput);
if (badAssess.humanReady) {
  console.error("FAIL: contaminated pack should not pass human writing gate");
  console.error(badAssess.reasons);
  process.exit(1);
}

if (!shouldWithholdHumanWritingPack(badPack, complaintInput)) {
  console.error("FAIL: should withhold bad pack");
  process.exit(1);
}

const delivered = deliverBlogDespiteGate(complaintInput, badPack, {
  reasons: badAssess.reasons,
});
if (delivered) {
  console.error("FAIL: deliverBlogDespiteGate must return null for template pack");
  process.exit(1);
}

if (!isPreviewWithholdFailure({ reasons: badAssess.reasons }, badPack, complaintInput)) {
  console.error("FAIL: isPreviewWithholdFailure should block template pack");
  process.exit(1);
}

const goodInput = {
  brandName: "플레르퍼피",
  region: "파주",
  topic: "애견카페 플레르퍼피 다녀왔어요",
  purposeType: "visit",
  blogLengthTier: "short",
};

const goodPack = {
  title: "파주 플레르퍼피 애견카페 방문 후기",
  sections: [
    {
      heading: "애견카페, 찾게 된 계기",
      body:
        "반려견과 함께 쉬고 싶은데 입장 조건이 막혀서 검색하다가 파주 플레르퍼피를 알게 됐어요.\n\n직접 가보니 실내 놀이 구역과 좌석 분위기가 나뉘어 있었어요.",
    },
    {
      heading: "직접 다녀온 이야기",
      body:
        "입장 안내·몸무게 기준을 먼저 확인했고, 메뉴는 사람 음료와 반려 메뉴를 나눠 봤어요.\n\n혼잡한 시간대는 대기가 있을 수 있다고 들었어요.",
    },
    {
      heading: "당일 확인한 포인트",
      body:
        "주차·이용 시간은 당일 안내를 메모해 두었어요.\n\n궁금한 점은 매장 문의로 다시 확인하는 편이 정확해요.",
    },
  ],
  conclusion:
    "파주 플레르퍼피 애견카페 — 직접 가 본 뒤 본인 기준으로 정리해 봤어요.",
};

const goodAssess = assessHumanWritingDelivery(goodPack, goodInput);
if (!goodAssess.visit.ok || !goodAssess.infoGuide.ok) {
  console.error("FAIL: human visit pack should pass template checks", goodAssess.reasons);
  process.exit(1);
}

const goodDelivered = deliverBlogDespiteGate(goodInput, goodPack, {});
if (!goodDelivered?.blogContent) {
  console.error("FAIL: clean visit pack should be deliverable", goodAssess.reasons);
  process.exit(1);
}

console.log("OK: human writing delivery gate");
console.log("  bad reasons:", badAssess.reasons.slice(0, 5).join(", "));
console.log("  good score ready:", goodAssess.humanReady);
