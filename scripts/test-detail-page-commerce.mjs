import assert from "node:assert/strict";
import { inspectDetailPageFacts, needFact } from "../lib/product/detailPageFactDossier.js";
import { scoreDetailPageCommerce } from "../lib/product/detailPageCommerceCritique.js";
import { buildDetailPageFallbackPack } from "../lib/product/detailPageEngine.js";
import { renderDetailPageBodyHtml, wrapMallHtml } from "../lib/product/detailPageHtml.js";

const rice = {
  productName: "여주 햅쌀 10kg",
  brandName: "우리쌀가게",
  region: "여주",
  industry: "쌀가게",
  target: "집밥 차리는 손님",
  searchIntent: "포장만 보고 밥맛까지는 가늠이 안 된다",
  features: "당일 도정\n진공 포장\n여주 수확",
  pageLength: "standard",
};

const dossier = inspectDetailPageFacts(rice);
assert.ok(dossier.missingRequired.includes("가격"));
assert.ok(dossier.sourceFacts.some((f) => f.label === "산지" && f.value.includes("여주")));
assert.ok(dossier.specRows.some((r) => r[0] === "가격" && r[1] === needFact("가격")));
assert.equal(dossier.specRows.some((r) => /품종/.test(r[0]) && /진상|추청/.test(r[1])), false);

const pack = buildDetailPageFallbackPack(rice);
const html = renderDetailPageBodyHtml(pack, [
  { src: "/detail-sample/open-rice-hero.png", slot: "hero" },
]);
const doc = wrapMallHtml(html, pack, "smartstore");
assert.equal((html.match(/<h1[\s>]/g) || []).length, 1);
assert.ok(html.includes('data-cta="close"'));
assert.equal(html.includes("<button"), false);
assert.ok(html.includes('data-layout="faq"'));
assert.ok(html.includes("[자료 필요: 가격]"));
assert.ok(html.includes("[자료 필요: 배송비]") || html.includes("[자료 필요: 출고"));
assert.equal(html.includes("집밥 차리는 손님 · [자료 필요"), false);
assert.equal(html.includes("data-photo-brief"), false);
assert.equal(html.includes("사진 손에"), false);
assert.equal(html.includes("주장·사실·이익"), false);
assert.ok(html.includes("당일 도정"));
assert.ok(pack.sections.some((s) => s.type === "notice"));
assert.equal(typeof pack.sections.find((s) => s.type === "observe")?.imageBrief, "object");
assert.ok(pack.sections.find((s) => s.type === "observe").imageBrief.prompt.includes("쌀알"));
assert.ok(pack._meta.commerce.sections.find((s) => s.id === "observe")?.imageBrief?.purpose);
assert.equal(html.includes("크게 외치지"), false);
assert.equal(html.includes("기준만 챙기면"), false);
assert.ok(html.includes("max-width:860px"));
assert.ok(html.includes("min-width:360px"));
assert.equal(html.includes("/detail-sample/open-rice-observe.png"), false);
assert.ok(pack._meta.critique.ok, JSON.stringify(pack._meta.critique));
assert.ok(pack._meta.critique.total >= 75);
assert.ok(pack._meta.commerce.missingRequired.includes("가격"));
assert.ok(doc.includes("<h1"));
const critique = scoreDetailPageCommerce({ pack, html, dossier });
assert.equal(critique.invented, false);

console.log(
  `ok detail-page-commerce missing=${dossier.missingRequired.length} critique=${pack._meta.critique.total} success=${pack._meta.success.score}`
);
