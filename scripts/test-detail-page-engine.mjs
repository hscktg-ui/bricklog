/**
 * 상품 상세페이지 엔진 — 섹션 JSON + 860px HTML 회귀
 */
import assert from "node:assert/strict";
import {
  buildDetailPageFallbackPack,
  parseDetailPageLlmPack,
  normalizeDetailPageInput,
  stampDetailPagePack,
} from "../lib/product/detailPageEngine.js";
import {
  renderDetailPageBodyHtml,
  wrapSmartstoreHtml,
  packToPlainText,
} from "../lib/product/detailPageHtml.js";
import { DETAIL_PAGE_WIDTH } from "../lib/product/detailPageCatalog.js";
import { getChannelFullText } from "../lib/content/channelPack.js";
import { assertCore1DeliveryStamped } from "../lib/product/briclogCoreRules.js";

const prevMission = process.env.BRICLOG_MISSION;
const prevCore = process.env.BRICLOG_CORE_RULES;
process.env.BRICLOG_MISSION = "true";
process.env.BRICLOG_CORE_RULES = "true";

const input = {
  productName: "여주 햅쌀 10kg",
  brandName: "여주미곡",
  region: "여주",
  industry: "쌀가게",
  target: "집밥 차리는 손님",
  features: "당일 도정\n진공 포장\n여주 수확",
  pageLength: "standard",
  brandId: "brand-test-rice",
};

const n = normalizeDetailPageInput(input);
assert.equal(n.productName, "여주 햅쌀 10kg");
assert.equal(n.features.length, 3);

const pack = buildDetailPageFallbackPack(input);
assert.ok(pack.sections.length >= 6, "standard length should have 6+ sections");
assert.equal(pack.sections[0].type, "hero");
assert.ok(pack.sections.some((s) => s.type === "usp"));
assert.ok(pack.sections.some((s) => s.type === "cta"));
assert.equal(typeof pack._meta?.sqv?.score, "number");
assert.ok(pack._meta.sqv.score >= 50);
assertCore1DeliveryStamped(pack, "detailPage", "detailPage");

const html = renderDetailPageBodyHtml(pack, []);
assert.ok(html.includes(`${DETAIL_PAGE_WIDTH}px`));
assert.ok(html.includes("여주 햅쌀"));
assert.ok(html.includes("여주미곡"));
assert.equal(html.includes("lorem"), false);

const doc = wrapSmartstoreHtml(html);
assert.ok(doc.startsWith("<!DOCTYPE html>"));
assert.ok(doc.includes("briclog-detail-page"));

const text = packToPlainText(pack);
assert.ok(text.includes("여주 햅쌀"));
assert.ok(getChannelFullText(pack, "detailPage").includes("여주미곡"));

const llm = parseDetailPageLlmPack(
  JSON.stringify({
    productName: "여주 햅쌀 10kg",
    headline: "여주에서 도정한 쌀",
    subhead: "집밥용",
    sections: [
      { type: "hero", title: "여주 햅쌀 10kg", body: "여주미곡에서 당일 도정합니다." },
      {
        type: "usp",
        title: "고르는 기준",
        bullets: ["당일 도정", "진공 포장"],
      },
      { type: "cta", title: "직접 보고 고르세요", body: "여주미곡에 문의하세요." },
    ],
  }),
  input
);
assert.ok(llm);
assert.equal(llm.sections[0].type, "hero");
assert.ok(llm._meta.sqv.score > 0);

const stamped = stampDetailPagePack(llm, n, "llm");
assert.equal(stamped._meta.contentChannel, "detailPage");

if (prevMission === undefined) delete process.env.BRICLOG_MISSION;
else process.env.BRICLOG_MISSION = prevMission;
if (prevCore === undefined) delete process.env.BRICLOG_CORE_RULES;
else process.env.BRICLOG_CORE_RULES = prevCore;

console.log("ok detail-page-engine", pack.sections.length, "sections");
