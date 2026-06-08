/**
 * Content Quality Delivery — SQV v2 송출 SSOT regression
 */
import { finalizeContentQualityForDelivery, attachContentQualityToApiMeta } from "../lib/product/contentQualityDelivery.js";
import { computeContentQualityValue } from "../lib/product/contentQualityValue.js";
import { resolvePublishReadiness } from "../lib/product/publishReadinessDisplay.js";

const brandIntro = {
  v4Speaker: "brand_intro",
  brandName: "에이스침대",
  region: "파주",
  topic: "루체3 전시소식",
  industry: "가구/침대",
  blogLengthTier: "medium",
};

const contaminated = {
  title: "파주 에이스침대, 루체3 전시",
  sections: [
    {
      heading: "안내",
      body: "파주 에이스침대 루체3 전시소식 관련 전시·구성 을 미리 정리해 두면 방문 전 비교가 수월합니다.",
    },
    {
      heading: "구성",
      body: "현장에서 메모해 뒀어요. 10분 넘게 누워보니 지지감이 달랐어요.",
    },
  ],
};

const finalized = finalizeContentQualityForDelivery(contaminated, brandIntro, "blog");
const sqv = finalized._meta?.sqv;

if (!sqv || sqv.version !== "v2") {
  console.error("FAIL: sqv v2 missing", sqv);
  process.exit(1);
}
if (typeof sqv.score !== "number" || !sqv.grade) {
  console.error("FAIL: sqv score/grade", sqv);
  process.exit(1);
}
if (sqv.breakdown?.speakerSurface == null) {
  console.error("FAIL: sqv breakdown missing speakerSurface", sqv.breakdown);
  process.exit(1);
}
if (!finalized._meta?.contentQualityDelivered) {
  console.error("FAIL: contentQualityDelivered meta");
  process.exit(1);
}
if (/메모(?:해|한)\s*(?:뒀|두)|누워\s*보/.test(finalized.sections.map((s) => s.body).join(" "))) {
  console.error("FAIL: visit leak survived finalize");
  process.exit(1);
}

const readiness = resolvePublishReadiness(finalized);
if (readiness.sqvScore == null) {
  console.error("FAIL: publish readiness should carry sqv", readiness);
  process.exit(1);
}

const apiMeta = attachContentQualityToApiMeta({ v2PipelineVerified: true }, finalized);
if (apiMeta.contentQualityValue !== sqv.score || !apiMeta.sqv?.grade) {
  console.error("FAIL: api meta sqv attach", apiMeta);
  process.exit(1);
}

const recomputed = computeContentQualityValue(finalized, brandIntro);
if (recomputed.version !== "v2") {
  console.error("FAIL: recompute version", recomputed.version);
  process.exit(1);
}

console.log("OK: content quality delivery — sqv v2, finalize, api meta, publish readiness");
console.log("  score:", sqv.score, "grade:", sqv.grade, "publishReady:", sqv.publishReady);
