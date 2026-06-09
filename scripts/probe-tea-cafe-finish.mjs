/**
 * 티카페 — LLM 조사 + Golden Benchmark 구조 송출본
 */
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { applyGoldenSafeEdit } from "../lib/golden/goldenSafeEditEngine.js";
import { assessGoldenQualityGate } from "../lib/golden/goldenQualityGate.js";
import { finalizeContentQualityForDelivery } from "../lib/product/contentQualityDelivery.js";
import { getBlogFullText } from "../utils/qualityCheck.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const INPUT = {
  brandName: "다온티하우스",
  region: "경주",
  topic: "가을 시즌 티 메뉴와 다실 분위기",
  mainKeyword: "경주 티카페",
  industry: "티카페",
  blogLengthTier: "medium",
  v4Speaker: "brand_intro",
  researchFacts: [
    { fact: "가을 시즌 밤차·사과차·보이차·허브티 메뉴", source: "research" },
    { fact: "창가 단독석·2~4인 테이블·조용한 다실", source: "research" },
    { fact: "티 세트·스콘·마들렌 디저트 함께 주문", source: "research" },
  ],
  v2PreWriteVerified: true,
};

let pack = {
  title: "경주에서 가을 시즌 티 메뉴, 다온티하우스 다실 이야기",
  sections: [
    {
      heading: "",
      body: `가을이 되면 티 메뉴판도 조금씩 달라집니다.

따뜻한 보이차·우롱차·허브티·밀크티가 앞쪽에 올라오고, 스콘·마들렌 같은 다과도 계절감 있게 바뀝니다. 특히 가을에는 밤차·사과차처럼 과일과 곡물 향이 은은한 차를 찾는 분들이 많습니다.

경주 황리단길 인근 다온티하우스에서도 가을 시즌 티 메뉴를 중심으로 차 한 잔의 여유를 준비하고 있습니다.`,
    },
    {
      heading: "",
      body: `티카페를 고를 때는 차 종류만큼이나 다실 분위기를 함께 봅니다.

조용히 책을 읽을 시간이라면 창가 단독석과 조명, 대화 위주라면 2~4인 테이블 간격과 소음 정도를 먼저 확인하는 편이 좋습니다. 찻잔과 티포트, 트레이 구성이 정돈되어 있으면 차에 집중하기 좋습니다.

처음 방문이라면 시그니처 티 한 잔과 스콘 세트가 무난하고, 계절 메뉴가 궁금하다면 당일 추천 차를 물어보는 편이 좋습니다.`,
    },
    {
      heading: "",
      body: `차는 우려내는 시간이 필요합니다.

카페인이 부담된다면 허브티·루이보스·디카페인 우롱을 고르는 것도 방법입니다. 티 세트를 주문한다면 디저트 구성과 2인 기준 분량도 미리 확인해 두면 편합니다.

경주를 걷다 잠깐 쉬어 가기 좋은 곳이라면, 영업 시간과 주말 대기 여부도 함께 짚어 두면 일정이 덜 흔들립니다. 진한 보이차에는 담백한 마들렌, 향긋한 허브티에는 과일 스콘이 잘 맞는 편입니다.`,
    },
    {
      heading: "",
      body: `다온티하우스는 늦은 오후에 들러 차 한 잔과 다과를 함께 즐기기 좋은 다실 분위기를 갖추고 있습니다.

관광 동선 중 짧게 앉아 쉬어 가도, 혼자 조용히 시간을내도 자연스럽게 어울리는 공간입니다. 가을 바깥 풍경을 바라보며 차를 우려내는 시간, 그 자체가 경주를 걷는 또 다른 방법이 됩니다.`,
    },
  ],
  conclusion: `계절은 바뀌고 차 메뉴도 바뀝니다.

올가을에는 일상 속에 차 한 잔의 여유를 더해 보시는 건 어떨까요.`,
  _meta: {
    editorialQualityStandard: true,
    editorialQualityVersion: "v1",
  },
};

pack = finalizeContentQualityForDelivery(pack, INPUT, "blog");
const full = getBlogFullText(pack);
const goldenGate = pack._meta?.goldenGate || assessGoldenQualityGate(pack, INPUT);

const meta = {
  industry: "tea_cafe",
  chars: full.replace(/\s/g, "").length,
  goldenScore: goldenGate.score,
  verdict: goldenGate.verdict,
  publishReady: pack._meta?.publishReady,
};

writeFileSync(join(root, "artifacts", "probe-tea-cafe", "article-final.md"), full, "utf8");
writeFileSync(join(root, "artifacts", "probe-tea-cafe", "meta-final.json"), JSON.stringify(meta, null, 2), "utf8");
console.log(JSON.stringify(meta, null, 2));
console.log("\n---\n", full);
