import assert from "node:assert/strict";
import { buildBrandFocusedSectionHeadings } from "@/lib/content/outlinePackGuard.js";
import { ensureMinBlogSections } from "@/lib/content/blogLengthControl.js";
import { finalizeContentQualityForDelivery } from "@/lib/product/contentQualityDelivery.js";
import { getBlogFullText } from "@/utils/qualityCheck.js";

const input = {
  brandName: "여주목마",
  region: "여주",
  topic: "수영장 오픈소식 직접 다녀온 후기",
  mainKeyword: "수영장 오픈소식",
  industry: "카페",
  blogLengthTier: "medium",
};

const headings = buildBrandFocusedSectionHeadings(input, 6);
assert.ok(
  !headings.some((h) => /방문·구매\s*전\s*확인할\s*것/.test(h)),
  `visit review should not use info headings: ${headings.join(" | ")}`
);
assert.ok(
  headings.some((h) => /찾게\s*된\s*계기|첫인상|직접/.test(h)),
  `visit review arc headings expected: ${headings.join(" | ")}`
);

const thinPack = {
  title: "여주목마 수영장 오픈소식 직접 다녀온 후기",
  representativeTitle: "여주목마 수영장 오픈소식 직접 다녀온 후기",
  sections: [
    {
      heading: "여주에서 수영장 오픈소식을 알아보는 이유",
      body: "검색만 하다 보면 기준이 많아서 어디서부터 볼지 막히는 날이 있다. 여주목마 안내 관련해 운영·예약 조건은 공식 안내 기준.",
    },
    {
      heading: "수영장 오픈소식 방문·구매 전 확인할 것",
      body: "여주목마 여주 로컬 매장 운영·예약 맥락.",
    },
    {
      heading: "수영장 오픈소식 방문·구매 전 확인할 것",
      body: "여주 여주목마 브랜드별 강점을 비교할 때 기준이 되는 항목을 미리 정리해 두었어요.",
    },
    {
      heading: "수영장 오픈소식 방문·구매 전 확인할 것",
      body: "여주목마 안내을 가격은 모델·구성·행사·카드 혜택에 따라 달라질 수 있어 매장 견적이 가장 정확합니다.",
    },
  ],
  conclusion: "여주 여주목마 수영장 오픈소식 매장에서 직접 확인한 뒤 본인 기준으로 정리해 봤어요.",
  _meta: { missionProseFallback: true },
};

const padded = ensureMinBlogSections(thinPack, input, input, 4);
const paddedHeadings = (padded.sections || []).map((s) => s.heading);
const dupChecklist = paddedHeadings.filter((h) =>
  /방문·구매\s*전\s*확인할\s*것/.test(h)
);
assert.ok(
  dupChecklist.length <= 1,
  `length pad should not repeat checklist heading: ${paddedHeadings.join(" | ")}`
);

const delivered = finalizeContentQualityForDelivery(
  thinPack,
  input,
  "blog",
  { forceRedelivery: true }
);
const full = getBlogFullText(delivered);
assert.ok(!/검색만 하다 보면/.test(full), "search cliche removed");
assert.ok(
  !/운영·예약 조건은 공식 안내 기준/.test(full),
  "official boilerplate removed"
);
assert.ok(
  (full.match(/방문·구매 전 확인할 것/g) || []).length <= 1,
  "duplicate checklist heading capped"
);
assert.ok(
  /수영|물놀이|식사|카페|가족/.test(full),
  `visit narrative expected: ${full.slice(0, 280)}`
);

console.log("OK: yeoju mokma visit review delivery");
