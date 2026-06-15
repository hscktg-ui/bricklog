import assert from "node:assert/strict";
import {
  classifyVisitSource,
  parseUtmFromSearch,
  VISIT_SOURCE_LABELS,
} from "../lib/analytics/visitSource.js";

assert.equal(
  classifyVisitSource({ referrer: "https://www.google.co.kr/search?q=briclog" }),
  "google_organic"
);
assert.equal(
  classifyVisitSource({ referrer: "https://search.naver.com/search.naver?query=브릭로그" }),
  "naver_organic"
);
assert.equal(classifyVisitSource({ referrer: "" }), "direct");
assert.equal(
  classifyVisitSource({
    utmSource: "naver_cafe",
    utmMedium: "social",
    referrer: "",
  }),
  "social"
);
assert.equal(
  classifyVisitSource({
    utmSource: "partner_blog",
    utmMedium: "referral",
    referrer: "",
  }),
  "referral"
);
assert.equal(
  classifyVisitSource({
    utmSource: "google",
    utmMedium: "cpc",
    referrer: "",
  }),
  "google_ads"
);
assert.equal(
  classifyVisitSource({ referrer: "https://www.instagram.com/" }),
  "social"
);
assert.equal(
  classifyVisitSource({ referrer: "https://briclog.ai/help" }),
  "internal"
);

const utm = parseUtmFromSearch("?utm_source=naver_cafe&utm_medium=social&utm_campaign=beta");
assert.equal(utm.utmSource, "naver_cafe");
assert.equal(utm.utmMedium, "social");
assert.equal(utm.utmCampaign, "beta");

assert.ok(VISIT_SOURCE_LABELS.naver_organic);

console.log("test-visit-source: ok");
