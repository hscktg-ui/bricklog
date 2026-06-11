/**
 * Brand warehouse — always visible, brand switch seeds topic/tone
 */
import assert from "node:assert/strict";
import { shouldShowBrandWarehouse } from "@/lib/dashboard/workspaceMaturity.js";
import { brandMemoryToFormInput } from "@/lib/brands/brandMemory.js";
import { learnFromEdit } from "@/lib/learning/brandLearning.js";

assert.equal(shouldShowBrandWarehouse(0, { brandCount: 0 }), true);
assert.equal(shouldShowBrandWarehouse(0, { brandCount: 1 }), true);

const brand = {
  id: "b1",
  brandName: "그랩앤고플라워",
  region: "운정",
  industry: "flower",
  tone: "warm",
  mainKeyword: "여름 꽃",
  recentContent: { blog: { preview: "운정 꽃집 여름 추천" } },
};
const form = brandMemoryToFormInput(brand);
assert.equal(form.brandId, "b1");
assert.equal(form.tone, "warm");
assert.ok(form.topic.includes("여름") || form.topic.includes("운정"));

const serverBrand = { ...brand, id: "b1" };
const learned = learnFromEdit(
  "b1",
  "blog",
  "짧은 글.",
  "조금 더 길고 따뜻한 문장으로 다듬었습니다.",
  serverBrand
);
assert.ok(learned);
assert.ok((learned.learning?.editCount || 0) >= 1);

console.log("OK: brand-warehouse-flow");
