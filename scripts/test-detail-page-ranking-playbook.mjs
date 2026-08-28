import assert from "node:assert/strict";
import {
  DETAIL_PAGE_RANKING_SEQUENCE,
  DETAIL_PAGE_LIST_TOOL_USE,
  formatRankingPlaybookForPrompt,
} from "../lib/product/detailPageRankingPlaybook.js";
import { DETAIL_PAGE_LENGTHS } from "../lib/product/detailPageCatalog.js";
import { gptDetailPageSystemPrompt } from "../lib/product/detailPageStandard.js";
import { buildDetailPageFallbackPack } from "../lib/product/detailPageEngine.js";

assert.equal(DETAIL_PAGE_RANKING_SEQUENCE.length, 10);
assert.equal(DETAIL_PAGE_LIST_TOOL_USE.length, 4);
assert.ok(DETAIL_PAGE_LIST_TOOL_USE.every((t) => t.take && t.leave));
assert.ok(formatRankingPlaybookForPrompt().includes("크리에이지"));
assert.ok(formatRankingPlaybookForPrompt().includes("가짜 후기"));
assert.ok(DETAIL_PAGE_LENGTHS.standard.sectionIds.includes("scene"));
assert.ok(formatRankingPlaybookForPrompt().includes("카테고리 분석"));
assert.ok(
  gptDetailPageSystemPrompt({
    brandName: "여주미곡",
    sectionIds: DETAIL_PAGE_LENGTHS.standard.sectionIds,
  }).includes("상위 상세 리듬")
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

console.log("ok detail-page-ranking-playbook seq=10 tools=4 scene=1");
