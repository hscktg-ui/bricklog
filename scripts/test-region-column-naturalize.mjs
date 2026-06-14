/**
 * 지역명 칼럼 자연화 — SEO 반복 억제 회귀
 */
import { applyRegionColumnNaturalizePass, scoreRegionColumnNaturalize } from "@/lib/content/regionColumnNaturalizeEngine.js";
import { getBlogFullText } from "@/utils/qualityCheck.js";
import { countTokenMentions } from "@/lib/product/antiSeoSpamEngine.js";

process.env.BRICLOG_MISSION = "1";

const INPUT = {
  brandName: "티카페",
  region: "강남",
  topic: "시즌 디저트 추천",
  mainKeyword: "시즌 디저트 추천",
  industry: "카페",
};

const pack = {
  title: "강남 티카페 시즌 디저트 추천",
  representativeTitle: "강남 티카페 시즌 디저트 추천",
  sections: [
    {
      heading: "강남 티카페, 시즌 디저트 알아보게 된 이유",
      body:
        "강남 티카페 시즌 디저트를 찾다가 매장 분위기부터 봤어요.\n\n" +
        "강남에서 디저트 진열대를 천천히 봤고, 강남 티카페 안내를 들으며 메모했어요.\n\n" +
        "강남 티카페 시즌 메뉴는 계절마다 달라져서 당일 확인이 필요했어요.",
    },
    {
      heading: "강남 티카페 직접 맛본 뒤 정리",
      body:
        "크림 톤이 부담 없어서 오후에 앉기 좋았어요.\n\n" +
        "강남 티카페에서 시즌 디저트를 비교해 봤어요.\n\n" +
        "강남 쪽 카페는 주말 웨이팅이 길어서 평일 오전이 편했어요.",
    },
    {
      heading: "강남 티카페 방문 팁",
      body: "강남 티카페 영업 시간과 주차는 매장 안내를 참고하면 됩니다.",
    },
  ],
  conclusion: "강남 티카페 시즌 디저트는 목적에 맞게 비교해 보시면 좋습니다.",
  _meta: { missionProseFallback: true },
};

const beforeCount = countTokenMentions(getBlogFullText(pack), INPUT.region);
if (beforeCount < 6) {
  throw new Error(`fixture too weak: region count ${beforeCount}`);
}

const next = applyRegionColumnNaturalizePass(pack, INPUT);
const full = getBlogFullText(next);
const afterCount = countTokenMentions(full, INPUT.region);
const score = scoreRegionColumnNaturalize(full, INPUT);

if (afterCount > score.cap) {
  throw new Error(`region still over cap: ${afterCount} > ${score.cap}`);
}

const lateHeading = next.sections[1]?.heading || "";
if (/강남/.test(lateHeading)) {
  throw new Error(`late heading still has region: ${lateHeading}`);
}

if (!next._meta?.regionColumnNaturalize) {
  throw new Error("missing regionColumnNaturalize meta");
}

console.log("OK: region-column-naturalize", {
  beforeCount,
  afterCount,
  cap: score.cap,
  lateHeading: next.sections[1]?.heading,
});
