import { isMechanicalListingTitle } from "../lib/content/humanTitleEngine.js";
import { applyBrandContentTitles } from "../lib/content/brandContentEngine.js";
import {
  detectVerbatimTopicUsage,
  ensureVerbatimTopicCompliance,
} from "../lib/content/informationUnitEngine.js";

const input = {
  brandName: "품질감사카페",
  region: "서울 강남",
  topic: "봄 시즌 브런치 메뉴 오픈",
  mainKeyword: "브런치",
  industry: "카페",
  blogLengthTier: "medium",
};

const pack = {
  title: "서울 강남 품질감사카페 봄 시즌 브런치 메뉴",
  representativeTitle: "서울 강남 품질감사카페 봄 시즌 브런치 메뉴",
  sections: [
    {
      heading: "브런치",
      body: Array.from(
        { length: 12 },
        () =>
          "서울 강남 품질감사카페 봄 시즌 브런치 메뉴를 보면 가격·구성·이용 방법을 비교하는 편이 좋습니다. 점심 전후로 잠깐 앉고 싶은데 메뉴와 분위기를 검색만으로는 잘 안 그려지는 날이 있다."
      ).join("\n\n"),
    },
    {
      heading: "이용",
      body: "봄 시즌 브런치 메뉴 관련 조건은 시즌에 따라 달라질 수 있어요. 브런치 메뉴는 고객 만족도가 높다는 평이 있어요.",
    },
    {
      heading: "정리",
      body: "가격·구성·이용 방법을 함께 보면 선택이 수월합니다.",
    },
  ],
  conclusion: "품질감사카페 브런치 — 확인 후 정리해 보세요.",
};

const titled = applyBrandContentTitles(pack, { input }, input);
const title = titled.representativeTitle || titled.title;
if (isMechanicalListingTitle(title, { input }, input)) {
  console.error("FAIL: title still mechanical", title);
  process.exit(1);
}

const scrubbed = ensureVerbatimTopicCompliance(titled, input, "blog");
const verbatim = detectVerbatimTopicUsage(scrubbed, input);
if (!verbatim.ok) {
  console.error("FAIL: verbatim still high", verbatim);
  process.exit(1);
}

console.log("OK:", title.slice(0, 48), "verbatim count", verbatim.count);
