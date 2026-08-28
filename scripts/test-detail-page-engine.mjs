/**
 * 상품 상세페이지 엔진 — 브릭로그 기준 + 860px HTML 회귀
 */
import assert from "node:assert/strict";
import {
  buildDetailPageFallbackPack,
  parseDetailPageLlmPack,
  normalizeDetailPageInput,
  stampDetailPagePack,
  generateDetailPagePack,
} from "../lib/product/detailPageEngine.js";
import {
  renderDetailPageBodyHtml,
  wrapSmartstoreHtml,
  packToPlainText,
} from "../lib/product/detailPageHtml.js";
import { DETAIL_PAGE_WIDTH } from "../lib/product/detailPageCatalog.js";
import { assignDetailPagePhotos } from "../lib/product/detailPagePhotos.js";
import { getChannelFullText } from "../lib/content/channelPack.js";
import { assertCore1DeliveryStamped } from "../lib/product/briclogCoreRules.js";
import { assessDetailPageStandard, applyEditedDetailPageSections } from "../lib/product/detailPageStandard.js";
import { getDetailPageCompanyPreset, DETAIL_PAGE_OPEN_EXAMPLES } from "../lib/product/detailPageCompanyPresets.js";
import { sanitizePublicDetailPageBody } from "../lib/product/detailPagePublic.js";

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
  searchIntent: "포장만 보고 밥맛까지는 가늠이 안 된다",
  features: "당일 도정\n진공 포장\n여주 수확",
  pageLength: "standard",
  brandId: "brand-test-rice",
};

const n = normalizeDetailPageInput(input);
assert.equal(n.productName, "여주 햅쌀 10kg");
assert.equal(n.features.length, 3);
assert.equal(n.searchIntent.includes("밥맛"), true);

const pack = buildDetailPageFallbackPack(input);
assert.ok(pack.sections.length >= 6, "standard length should have 6+ sections");
assert.equal(pack.sections[0].type, "hero");
assert.ok(pack.sections.some((s) => s.type === "intent"));
assert.ok(pack.sections.some((s) => s.type === "usp"));
assert.ok(pack.sections.some((s) => s.type === "cta"));
assert.equal(typeof pack._meta?.sqv?.score, "number");
assert.ok(pack._meta.sqv.score >= 50);
assert.equal(pack._meta.standard.ok, true, pack._meta.standard.reasons.join(","));
assert.equal(pack._meta.standard.rules.soft_cta, true);
assertCore1DeliveryStamped(pack, "detailPage", "detailPage");

const html = renderDetailPageBodyHtml(pack, []);
assert.ok(html.includes(`${DETAIL_PAGE_WIDTH}px`));
assert.ok(html.includes("여주 햅쌀"));
assert.ok(html.includes("여주미곡"));
assert.ok(html.includes('data-standard="briclog-pdp-v1"'));
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

const fake = assessDetailPageStandard(
  {
    headline: "여주 햅쌀",
    brandName: "여주미곡",
    sections: [
      { type: "hero", title: "여주 햅쌀", body: "여주미곡 쌀입니다." },
      { type: "intent", title: "고를 때", body: "포장만 보고 막힙니다." },
      { type: "usp", title: "후기", body: "실구매자 별점 만점에 무조건 추천." },
      { type: "cta", title: "지금 바로 구매", body: "지금 바로 구매하세요." },
    ],
  },
  { brandName: "여주미곡" }
);
assert.equal(fake.ok, false);
assert.ok(fake.reasons.includes("fake_review"));
assert.ok(fake.reasons.includes("hard_cta"));
assert.equal(fake.rules.facts_only, false);
assert.equal(fake.rules.soft_cta, false);

const haeshinPreset = getDetailPageCompanyPreset("haeshin-ops");
assert.equal(haeshinPreset.brandName, "해신기획");
const haeshin = buildDetailPageFallbackPack({ presetId: "haeshin-ops" });
assert.ok(haeshin.sections.some((s) => s.type === "intent"));
assert.ok(packToPlainText(haeshin).includes("해신기획"));
assert.equal(haeshin._meta.standard.ok, true, haeshin._meta.standard.reasons.join(","));
assert.equal(packToPlainText(haeshin).includes("맞춤를"), false);
assert.ok(
  haeshin.sections.find((s) => s.type === "usp")?.bullets?.some((b) =>
    b.includes("블로그")
  )
);

const home100 = buildDetailPageFallbackPack({ presetId: "home100-showroom" });
assert.ok(packToPlainText(home100).includes("HOME100"));
assert.equal(home100._meta.standard.ok, true, home100._meta.standard.reasons.join(","));

const edited = applyEditedDetailPageSections(
  pack,
  pack.sections.map((s, i) =>
    i === 0 ? { ...s, title: "여주에서 도정한 햅쌀", body: "여주미곡에서 당일 도정한 쌀입니다." } : s
  ),
  { brandName: "여주미곡" }
);
assert.equal(edited._meta.edited, true);
assert.ok(edited.sections[0].title.includes("도정한 햅쌀"));
assert.ok(renderDetailPageBodyHtml(edited, []).includes("도정한 햅쌀"));
assert.equal(edited._meta.standard.ok, true, edited._meta.standard.reasons.join(","));

const tooShort = applyEditedDetailPageSections(pack, pack.sections.slice(0, 2), {
  brandName: "여주미곡",
});
assert.equal(tooShort.sections.length, pack.sections.length);

const photos = [
  "https://example.com/p1.jpg",
  "https://example.com/p2.jpg",
  "https://example.com/p3.jpg",
  "https://example.com/p4.jpg",
  "https://example.com/p5.jpg",
];
const assigned = assignDetailPagePhotos(pack.sections, photos);
assert.equal(assigned.byType.hero, photos[0]);
assert.ok(assigned.byType.explain);
assert.equal(assigned.leftovers.length, 0);
const htmlWithPhotos = renderDetailPageBodyHtml(pack, photos);
assert.ok(htmlWithPhotos.includes('data-photo-slot="hero"'));
assert.ok(htmlWithPhotos.includes("p1.jpg"));
assert.ok(htmlWithPhotos.includes("p2.jpg"));
assert.equal(htmlWithPhotos.includes("p1.jpg") && htmlWithPhotos.includes("p2.jpg"), true);
assert.ok(htmlWithPhotos.includes('data-photos="'));
const heroIdx = htmlWithPhotos.indexOf("p1.jpg");
const secondIdx = htmlWithPhotos.indexOf("p2.jpg");
assert.ok(heroIdx >= 0 && secondIdx > heroIdx, "photos should follow slot order");

const shortPack = buildDetailPageFallbackPack({ ...input, pageLength: "short" });
const shortHtml = renderDetailPageBodyHtml(shortPack, photos);
assert.ok(shortHtml.includes('data-photo-gallery="1"'), "leftover photos go to gallery before CTA");

const openRice = DETAIL_PAGE_OPEN_EXAMPLES.find((p) => p.id === "open-rice");
assert.ok(openRice);
assert.equal(getDetailPageCompanyPreset("open-rice").productName, openRice.productName);

const publicBody = sanitizePublicDetailPageBody({
  productName: "여주 햅쌀 10kg",
  features: "당일 도정",
  presetId: "not-a-preset",
  pageLength: "nope",
});
assert.equal(publicBody.presetId, "");
assert.equal(publicBody.pageLength, "standard");
assert.equal(sanitizePublicDetailPageBody({}).productName, "");

const guestPack = await generateDetailPagePack(
  { productName: "여주 햅쌀 10kg", brandName: "여주미곡", features: "당일 도정" },
  { allowLlm: false }
);
assert.equal(guestPack.mode, "fallback");
assert.ok(guestPack.pack.sections.length >= 4);

if (prevMission === undefined) delete process.env.BRICLOG_MISSION;
else process.env.BRICLOG_MISSION = prevMission;
if (prevCore === undefined) delete process.env.BRICLOG_CORE_RULES;
else process.env.BRICLOG_CORE_RULES = prevCore;

console.log("ok detail-page-engine", pack.sections.length, "sections");
