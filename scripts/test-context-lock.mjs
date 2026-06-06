/**
 * Context Lock Engine 스모크
 * node --import ./scripts/register-alias.mjs scripts/test-context-lock.mjs
 */
import assert from "node:assert/strict";
import {
  lockGenerationContext,
  detectForeignIndustrySignals,
  scoreContentRelevance,
  assessBrandClarity10Seconds,
  assertContextLockPostWrite,
} from "../lib/content/contextLockEngine.js";

const marketingLock = lockGenerationContext({
  brandName: "해신기획",
  region: "서울",
  topic: "블로그 마케팅",
  industry: "마케팅",
});
assert.ok(marketingLock.ok);
assert.equal(marketingLock.lock.industryKey, "marketing");

const foreign = detectForeignIndustrySignals(
  "매트리스 지지력과 스프링 구조를 비교해 보세요.",
  marketingLock.lock
);
assert.ok(!foreign.ok, "marketing must reject furniture terms");

const snackLock = lockGenerationContext({
  brandName: "멍냥간식",
  region: "부산",
  topic: "수제 간식",
  industry: "펫푸드",
});
assert.ok(snackLock.ok);
const snackForeign = detectForeignIndustrySignals(
  "블로그 상위노출과 광고 캠페인을 운영합니다.",
  snackLock.lock
);
assert.ok(!snackForeign.ok);

const goodPack = {
  title: "해신기획 블로그 마케팅 안내",
  sections: [
    {
      heading: "해신기획이 하는 일",
      body: "해신기획은 블로그·콘텐츠 채널 운영과 검색 노출, 유입 전환을 돕는 마케팅 대행입니다. 문의와 상담으로 사례를 안내합니다.",
    },
    {
      heading: "채널 운영 포인트",
      body: "네이버 블로그와 SNS 채널을 함께 맞추면 브랜딩과 문의 전환이 자연스럽습니다. 콘텐츠 전략은 업종·지역에 맞게 잡습니다.",
    },
    {
      heading: "문의 안내",
      body: "해신기획에 블로그 마케팅·광고 운영 문의를 남기면 계약 전 사례를 확인할 수 있습니다.",
    },
  ],
};

const relevance = scoreContentRelevance(goodPack, {
  brandName: "해신기획",
  topic: "블로그 마케팅",
  industry: "마케팅",
  contextLock: marketingLock.lock,
});
assert.ok(relevance.ok, `relevance ${relevance.rate}`);
assert.ok(relevance.rate >= 0.8);

const clarity = assessBrandClarity10Seconds(goodPack, {
  brandName: "해신기획",
  topic: "블로그 마케팅",
  industry: "마케팅",
  contextLock: marketingLock.lock,
});
assert.ok(clarity.ok, clarity.reasons?.join(", "));

const badPack = {
  title: "해신기획 안내",
  sections: [
    {
      heading: "수면 팁",
      body: "매트리스 지지력과 스프링 구조, 체압 분산을 비교해 보세요. 누워 보면 쿠션감이 다릅니다.",
    },
    {
      heading: "보관",
      body: "알레르기 성분과 영양성분 표기를 확인하세요.",
    },
  ],
};
const post = assertContextLockPostWrite(badPack, {
  brandName: "해신기획",
  topic: "블로그 마케팅",
  industry: "마케팅",
  contextLock: marketingLock.lock,
});
assert.ok(!post.ok);
assert.ok(post.rewriteRequired);

console.log("OK: context lock engine");
