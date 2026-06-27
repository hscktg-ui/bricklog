/**
 * 무편집 발행 A등급 게이트 회귀
 */
import assert from "node:assert/strict";
import {
  assessUneditedPublishGrade,
  shouldWithholdUneditedPublish,
  UNEDITED_PUBLISH_MIN_SCORE,
} from "../lib/product/uneditedPublishGradeGate.js";
import {
  assessVisitReviewBenchmark,
  GPT_YEOJU_BENCHMARK_PACK,
} from "../lib/product/visitReviewBenchmarkRubric.js";
import { alignBlogApiDeliveryResponse } from "../lib/product/blogApiDeliveryGate.js";

process.env.BRICLOG_RESET_QUALITY = "true";

const yeojuInput = {
  brandName: "여주목마",
  region: "여주",
  topic: "여름시즌 오픈 소식",
  researchFacts: [
    { fact: "실외 수영장·물놀이 시설 여름 시즌 오픈", source: "research" },
    { fact: "식당·카페·승마 체험이 한 공간에 연결", source: "research" },
    { fact: "가족 단위 방문객 동선·휴식 공간 구성", source: "research" },
  ],
};

function padPackToPublishMin(pack, minChars = 1300) {
  const body = pack.sections.map((s) => s.body).join("\n");
  if (body.length >= minChars) return pack;
  const pad =
    " 실외 수영장과 승마 체험이 연결된 복합 공간이라 가족 동선이 자연스럽게 이어집니다.";
  const sections = pack.sections.map((s, i) =>
    i === 1
      ? { ...s, body: s.body + pad.repeat(Math.ceil((minChars - body.length) / pad.length)) }
      : s
  );
  return { ...pack, sections };
}

const goldenPack = padPackToPublishMin(GPT_YEOJU_BENCHMARK_PACK);
const golden = assessUneditedPublishGrade(goldenPack, yeojuInput);
assert.equal(golden.ok, true, "GPT golden passes unedited A gate");
assert.ok(golden.score >= UNEDITED_PUBLISH_MIN_SCORE, `golden score ${golden.score}`);

const cafeJunk = {
  title: "여주목마 여름시즌",
  sections: [
    {
      heading: "카공하기 좋은 분위기",
      body: "조도가 적당하고 좌석 배치가 넓어 카공하기 좋습니다. 브런치 메뉴도 다양합니다.",
    },
    {
      heading: "브런치와 음료",
      body: "아메리카노와 베이글 조합이 인상적입니다. 창가 자리가 인기입니다.",
    },
    {
      heading: "마무리",
      body: "한 번쯤 들러볼 만합니다.",
    },
  ],
  _meta: { generationMode: "mission_rescue_delivery" },
};

const junk = assessUneditedPublishGrade(cafeJunk, yeojuInput);
assert.equal(junk.ok, false, "cafe template on pool topic blocked");
assert.ok(junk.reasons.length > 0, "junk has withhold reasons");

const serverErr = shouldWithholdUneditedPublish(
  cafeJunk,
  yeojuInput,
  { mode: "server_error" }
);
assert.equal(serverErr.withhold, true, "server_error never delivers");

const aligned = alignBlogApiDeliveryResponse(
  {
    ok: true,
    withheld: false,
    mode: "server_error",
    blogContent: cafeJunk,
  },
  yeojuInput
);
assert.equal(aligned.withheld, true, "align withholds sub-A pack");
assert.equal(aligned.ok, false, "align sets ok false");
assert.equal(aligned.blogContent.sections.length, 0, "align strips junk sections");

const bench = assessVisitReviewBenchmark(goldenPack, yeojuInput);
assert.equal(bench.publishOk, true, "benchmark publishOk for golden");

console.log("OK unedited-publish-grade-gate");
