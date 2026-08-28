/**
 * 골라보다 상세페이지 엔진 — 860px HTML 회귀
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
import { assignDetailPagePhotos, normalizeDetailPagePhotos } from "../lib/product/detailPagePhotos.js";
import { getChannelFullText } from "../lib/content/channelPack.js";
import { assertCore1DeliveryStamped } from "../lib/product/briclogCoreRules.js";
import { assessDetailPageStandard, applyEditedDetailPageSections } from "../lib/product/detailPageStandard.js";
import { getDetailPageExample, DETAIL_PAGE_OPEN_EXAMPLES } from "../lib/product/detailPageCompanyPresets.js";
import { DETAIL_PAGE_PRODUCT } from "../lib/product/detailPageProduct.js";
import { sanitizePublicDetailPageBody } from "../lib/product/detailPagePublic.js";
import { gptDetailPageSystemPrompt } from "../lib/product/detailPageStandard.js";
import { DETAIL_PAGE_DESIGN_CONTEXT, formatDetailPageDesignBrief } from "../lib/product/detailPageContext.js";
import {
  catchDetailPageFixes,
  listDetailPageFixTargets,
} from "../lib/product/detailPageRevise.js";

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
assert.equal(n.contentChannel, "detailPage");
assert.equal(n.detailPageDesign?.width, DETAIL_PAGE_DESIGN_CONTEXT.width);
assert.ok(formatDetailPageDesignBrief().includes("860"));
assert.ok(gptDetailPageSystemPrompt({ brandName: "여주미곡", sectionIds: ["hero"] }).includes("Pretendard"));
assert.equal(DETAIL_PAGE_PRODUCT.name, "골라보다");
assert.equal(DETAIL_PAGE_PRODUCT.name.includes("브릭로그"), false);
assert.ok(DETAIL_PAGE_PRODUCT.metaTitle.startsWith("골라보다"));
assert.equal(DETAIL_PAGE_PRODUCT.fieldGroups.length, 4);
assert.equal(DETAIL_PAGE_PRODUCT.pillars.length, 4);

const pack = buildDetailPageFallbackPack(input);
assert.ok(pack.sections.length >= 6, "standard length should have 6+ sections");
assert.equal(pack.sections[0].type, "hero");
assert.ok(pack.sections.some((s) => s.type === "intent"));
assert.ok(pack.sections.some((s) => s.type === "usp"));
assert.ok(pack.sections.some((s) => s.type === "feature"));
assert.ok(pack._meta.sqv.score >= 95, `expected 95+, got ${pack._meta.sqv.score}`);
assert.equal(packToPlainText(pack).includes("손님가"), false);
assert.equal(packToPlainText(pack).includes("는 쪽"), false);
assert.equal(packToPlainText(pack).includes("없는 이나"), false);
assert.ok(packToPlainText(pack).includes("쪽 설명"));
assert.ok(packToPlainText(pack).includes("손님"));
assert.equal(pack._meta.compositionOk, true);
assert.equal(pack._meta.densityOk, true);
assert.equal(pack._meta.standard.ok, true, pack._meta.standard.reasons.join(","));
assert.equal(pack._meta.standard.rules.soft_cta, true);
assertCore1DeliveryStamped(pack, "detailPage", "detailPage");

const html = renderDetailPageBodyHtml(pack, []);
assert.ok(html.includes(`${DETAIL_PAGE_WIDTH}px`));
assert.ok(html.includes("여주 햅쌀"));
assert.ok(html.includes("여주미곡"));
assert.ok(html.includes('data-standard="gollaboda-pdp-v1"'));
assert.ok(html.includes("Pretendard"));
assert.ok(html.includes('data-grade="95"') || html.includes("data-grade=\"95\""));
assert.ok(html.includes("font-size:38px"));
assert.ok(html.includes("font-size:18px"));
assert.ok(html.includes('data-ui="section-layouts"'));
assert.ok(html.includes('data-layout="hero-stack"'));
assert.ok(html.includes('data-layout="usp-cards"'));
assert.ok(html.includes('data-layout="spec-sheet"'));
assert.ok(html.includes('data-layout="observe-quote"'));
assert.ok(html.includes('data-layout="cta-bar"'));

const doc = wrapSmartstoreHtml(html);
assert.ok(doc.startsWith("<!DOCTYPE html>"));
assert.ok(doc.includes("gollaboda-detail-page"));
assert.ok(doc.includes("pretendard"));

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

const ricePreset = getDetailPageExample("open-rice");
assert.equal(ricePreset.brandName, "우리쌀가게");
const riceFromPreset = buildDetailPageFallbackPack({ presetId: "open-rice" });
assert.ok(riceFromPreset.sections.some((s) => s.type === "intent"));
assert.ok(packToPlainText(riceFromPreset).includes("우리쌀가게"));
assert.equal(
  riceFromPreset._meta.standard.ok,
  true,
  riceFromPreset._meta.standard.reasons.join(",")
);
assert.equal(getDetailPageExample("haeshin-ops"), null);
assert.equal(getDetailPageExample("home100-showroom"), null);

const beans = buildDetailPageFallbackPack({ presetId: "open-beans" });
assert.ok(packToPlainText(beans).includes("골목카페"));
assert.equal(beans._meta.standard.ok, true, beans._meta.standard.reasons.join(","));

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
assert.equal(getDetailPageExample("open-rice").productName, openRice.productName);
assert.ok(formatDetailPageDesignBrief().includes("골라보다"));
assert.equal(formatDetailPageDesignBrief().includes("블로그 칼럼이 아니다"), true);
assert.equal(gptDetailPageSystemPrompt({ brandName: "여주미곡", sectionIds: ["hero"] }).includes("골라보다"), true);

const publicBody = sanitizePublicDetailPageBody({
  productName: "여주 햅쌀 10kg",
  features: "당일 도정",
  presetId: "not-a-preset",
  pageLength: "nope",
});
assert.equal(publicBody.presetId, "");
assert.equal(publicBody.pageLength, "standard");
assert.equal(sanitizePublicDetailPageBody({}).productName, "");
assert.equal(sanitizePublicDetailPageBody({ presetId: "haeshin-ops" }).presetId, "");
assert.equal(sanitizePublicDetailPageBody({ presetId: "open-rice" }).presetId, "open-rice");

const guestPack = await generateDetailPagePack(
  { productName: "여주 햅쌀 10kg", brandName: "여주미곡", features: "당일 도정" },
  { allowLlm: false }
);
assert.equal(guestPack.mode, "fallback");
assert.ok(guestPack.pack.sections.length >= 4);

const highlighted = buildDetailPageFallbackPack({
  ...input,
  highlights: "여주 당일 도정\n진공 그대로",
  mustInclude: "도정 시각은  visit 당일만 안내합니다.",
});
assert.ok(packToPlainText(highlighted).includes("여주 당일 도정"));
assert.ok(packToPlainText(highlighted).includes("도정 시각"));
assert.ok(renderDetailPageBodyHtml(highlighted, []).includes("data-highlights="));
assert.equal(packToPlainText(pack).includes("입력된 사실 바깥"), false);

const photoObjs = normalizeDetailPagePhotos([
  { src: "https://example.com/p1.jpg", caption: "맨 위 쌀 포대" },
  "https://example.com/p2.jpg",
]);
assert.equal(photoObjs[0].caption, "맨 위 쌀 포대");
assert.equal(photoObjs[1].src, "https://example.com/p2.jpg");
const htmlCaption = renderDetailPageBodyHtml(pack, photoObjs);
assert.ok(htmlCaption.includes("맨 위 쌀 포대"));

const dirty = {
  ...pack,
  sections: pack.sections.map((s) =>
    s.type === "cta"
      ? { ...s, body: "지금 바로 구매하세요. 실구매자 별점 만점입니다." }
      : s
  ),
};
const dirtyAssess = assessDetailPageStandard(dirty, { brandName: "여주미곡" });
assert.equal(dirtyAssess.ok, false);
const caught = catchDetailPageFixes(dirty, input);
assert.equal(caught._meta.catchFixes, true);
assert.equal(caught._meta.standard.ok, true, caught._meta.standard.reasons.join(","));
assert.equal(listDetailPageFixTargets(caught).length, 0);

const publicHi = sanitizePublicDetailPageBody({
  productName: "여주 햅쌀",
  highlights: "당일 도정",
  mustInclude: "진공 포장",
  imageCount: 3,
});
assert.equal(publicHi.highlights, "당일 도정");
assert.equal(publicHi.imageCount, 3);

if (prevMission === undefined) delete process.env.BRICLOG_MISSION;
else process.env.BRICLOG_MISSION = prevMission;
if (prevCore === undefined) delete process.env.BRICLOG_CORE_RULES;
else process.env.BRICLOG_CORE_RULES = prevCore;

console.log("ok detail-page-engine", pack.sections.length, "sections");
