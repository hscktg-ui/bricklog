/**
 * BRICLOG RESET — 품질 게이트 회귀 (placeholder·업종·검색의도·브랜드·90점)
 */
import {
  assessBriclogResetQualityGate,
  assessBrandFactPresence,
  assessSearchIntentContract,
} from "../lib/product/briclogResetQualityGate.js";
import { detectPlaceholderContamination } from "../lib/content/placeholderContaminationEngine.js";
import { detectIntrusionPhrasesForIndustry } from "../lib/pipeline/v2/industryLock.js";

process.env.BRICLOG_MISSION = "true";
process.env.BRICLOG_RESET_QUALITY = "true";

const flowerInput = {
  brandName: "그랩앤고플라워",
  industry: "flower",
  region: "파주 운정",
  storeFeatures: "24시간 무인, 만원 꽃다발, 무인 픽업",
  topic: "여름 꽃 추천",
  mainKeyword: "여름 꽃 추천",
};

const placeholderPack = {
  title: "여름 꽃 추천",
  sections: [
    {
      heading: "전시 소식",
      body: "이용 관련해서를 보면 좋은내용이 이 구성으로 정리됩니다.",
    },
  ],
};

const ph = detectPlaceholderContamination(placeholderPack, flowerInput);
if (ph.ok) {
  console.error("FAIL: placeholder pack must fail immediately");
  process.exit(1);
}

const phGate = assessBriclogResetQualityGate(placeholderPack, flowerInput);
if (!phGate.hardFail || !phGate.shouldWithhold) {
  console.error("FAIL: reset gate must hard-withhold placeholder pack", phGate);
  process.exit(1);
}

const intrusionPack = {
  title: "파주 운정 꽃다발",
  sections: [
    {
      heading: "꽃 고르기",
      body: "알레르기 성분과 원재료 표시, 전시 관련 조건을 함께 확인해 보세요.",
    },
    { heading: "포장", body: "리본과 메시지 카드로 마무리합니다." },
    { heading: "픽업", body: "24시간 무인 픽업이 가능합니다." },
  ],
};

const intrusion = detectIntrusionPhrasesForIndustry(intrusionPack, flowerInput);
if (intrusion.ok) {
  console.error("FAIL: flower intrusion phrases should be detected");
  process.exit(1);
}

const noFlowerNamesPack = {
  title: "여름 꽃 추천",
  sections: [
    {
      heading: "여름 분위기",
      body: "시원한 톤의 꽃으로 공간을 채우면 방문객이 편안해집니다.",
    },
    {
      heading: "선물",
      body: "기념일에는 메시지 카드와 리본을 함께 준비해 보세요.",
    },
    {
      heading: "그랩앤고플라워",
      body: "파주 운정에서 24시간 무인으로 만원 꽃다발을 만날 수 있습니다.",
    },
  ],
};

const search = assessSearchIntentContract(noFlowerNamesPack, flowerInput);
if (search.ok) {
  console.error("FAIL: summer flower recommend topic needs 3 flower names");
  process.exit(1);
}

const weakBrandPack = {
  title: "꽃집 안내",
  sections: [
    { heading: "소개", body: "꽃다발과 화병을 준비합니다." },
    { heading: "이용", body: "방문 전 예약을 권합니다." },
    { heading: "마무리", body: "감사합니다." },
  ],
};

const brand = assessBrandFactPresence(weakBrandPack, flowerInput);
if (brand.ok) {
  console.error("FAIL: weak brand pack should miss store facts");
  process.exit(1);
}

const goodPack = {
  title: "파주 운정 여름 꽃 추천",
  sections: [
    {
      heading: "장미와 수국",
      body: "여름에는 장미, 수국, 해바라기가 자주 찾습니다. 그랩앤고플라워는 파주 운정에서 24시간 무인으로 만원 꽃다발을 고를 수 있습니다.",
    },
    {
      heading: "튤립과 거베라",
      body: "튤립은 선물용으로 무난하고, 거베라는 밝은 톤을 살립니다. 무인 픽업이라 늦은 시간에도 부담이 적습니다.",
    },
    {
      heading: "선택 팁",
      body: "리본과 메시지 카드로 마무리하면 전달이 수월합니다. 운정 인근에서 바로 픽업할 수 있어요.",
    },
  ],
  conclusion: "여름 꽃은 장미·수국·해바라기·튤립·거베라를 기준으로 고르면 됩니다.",
};

const goodBrand = assessBrandFactPresence(goodPack, flowerInput);
if (!goodBrand.ok) {
  console.error("FAIL: good pack should include brand facts", goodBrand);
  process.exit(1);
}

const goodSearch = assessSearchIntentContract(goodPack, flowerInput);
if (!goodSearch.ok) {
  console.error("FAIL: good pack should satisfy flower search intent", goodSearch);
  process.exit(1);
}

console.log("OK: briclog reset quality gate — placeholder, intrusion, search, brand");
