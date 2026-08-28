import assert from "node:assert/strict";
import {
  DETAIL_PAGE_RANKING_SEQUENCE,
  DETAIL_PAGE_LIST_TOOL_USE,
  DETAIL_PAGE_LIST_SAMPLE,
  DETAIL_PAGE_STANDARD_SOURCES,
  DETAIL_PAGE_RANKING_PLAYBOOK_VERSION,
  formatRankingPlaybookForPrompt,
  packFollowsRankingSequence,
  sortSectionsToRanking,
} from "../lib/product/detailPageRankingPlaybook.js";
import { DETAIL_PAGE_LENGTHS } from "../lib/product/detailPageCatalog.js";
import { gptDetailPageSystemPrompt } from "../lib/product/detailPageStandard.js";
import { buildDetailPageFallbackPack } from "../lib/product/detailPageEngine.js";

assert.equal(DETAIL_PAGE_RANKING_PLAYBOOK_VERSION, "detail-ranking-playbook-v3");
assert.equal(DETAIL_PAGE_STANDARD_SOURCES.rank.id, "naver-shop-rank");
assert.equal(DETAIL_PAGE_STANDARD_SOURCES.list.canonical, "creazy");
assert.equal(DETAIL_PAGE_RANKING_SEQUENCE.length, 10);
assert.equal(DETAIL_PAGE_LIST_TOOL_USE.length, 4);
assert.equal(DETAIL_PAGE_LIST_SAMPLE.sections.length, 20);
assert.ok(DETAIL_PAGE_LIST_SAMPLE.sections.some((s) => s.they.includes("5 Points") && s.take));
assert.ok(DETAIL_PAGE_LIST_SAMPLE.sections.some((s) => s.they.includes("리뷰") && !s.take));
assert.ok(DETAIL_PAGE_LIST_TOOL_USE.every((t) => t.take && t.leave));
assert.ok(formatRankingPlaybookForPrompt().includes("크리에이지"));
assert.ok(formatRankingPlaybookForPrompt().includes("가짜 후기"));
assert.ok(formatRankingPlaybookForPrompt().includes("네이버 쇼핑 랭킹"));
assert.ok(DETAIL_PAGE_LENGTHS.standard.sectionIds.includes("scene"));
assert.ok(DETAIL_PAGE_LENGTHS.standard.sectionIds.includes("notice"));
assert.ok(formatRankingPlaybookForPrompt().includes("HTML 텍스트"));
assert.ok(formatRankingPlaybookForPrompt().includes("[자료 필요]"));
assert.equal(formatRankingPlaybookForPrompt().includes("통이미지 카피"), false);
assert.ok(
  DETAIL_PAGE_LIST_TOOL_USE.every((t) => t.take.includes("PNG") || t.take.includes("섹션"))
);
assert.equal(
  DETAIL_PAGE_LIST_TOOL_USE.find((t) => t.id === "creazy").leave.includes("통이미지"),
  false
);
assert.ok(
  gptDetailPageSystemPrompt({
    brandName: "여주미곡",
    sectionIds: DETAIL_PAGE_LENGTHS.standard.sectionIds,
  }).includes("네이버 쇼핑 랭킹")
);
assert.ok(
  gptDetailPageSystemPrompt({
    brandName: "여주미곡",
    sectionIds: DETAIL_PAGE_LENGTHS.standard.sectionIds,
    input: { productName: "여주 햅쌀 10kg", industry: "쌀가게" },
  }).includes("산지")
);

const pack = buildDetailPageFallbackPack({
  productName: "여주 햅쌀 10kg",
  brandName: "우리쌀가게",
  features: "당일 도정\n진공 포장",
  pageLength: "standard",
});
assert.ok(pack.sections.some((s) => s.type === "scene"));
assert.ok(pack.sections.some((s) => s.type === "spec"));
assert.equal(packFollowsRankingSequence(pack), true);
assert.equal(pack._meta.ranking.source, "naver-shop-rank");
assert.equal(pack._meta.ranking.listSample, "creazy");
assert.equal(pack._meta.ranking.ok, true);

const scrambled = {
  sections: [
    { type: "cta", title: "다음" },
    { type: "hero", title: "쌀" },
    { type: "spec", title: "표" },
  ],
};
assert.equal(packFollowsRankingSequence(scrambled), false);
const sorted = sortSectionsToRanking(scrambled.sections, ["hero", "spec", "cta"]);
assert.deepEqual(
  sorted.map((s) => s.type),
  ["hero", "spec", "cta"]
);
assert.equal(packFollowsRankingSequence({ sections: sorted }), true);

console.log("ok detail-page-ranking-playbook seq=10 tools=4 sample=20 scene=1");
