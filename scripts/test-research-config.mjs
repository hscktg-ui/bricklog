/**
 * ResearchModePanel → 파이프라인 조사 설정 연동 검증
 */
import assert from "node:assert/strict";
import { resolveResearchQueryAndTypes } from "@/lib/research/resolveResearchConfig.js";

const base = {
  brandName: "에이스침대",
  region: "파주",
  topic: "오피모 전시",
};

const auto = resolveResearchQueryAndTypes(base);
assert.equal(auto.query, "에이스침대 파주 오피모 전시");
assert.equal(auto.querySource, "auto");
assert.ok(auto.types.includes("local"));

const userQuery = resolveResearchQueryAndTypes({
  ...base,
  researchQuery: "파주 신혼가구 트렌드",
  researchTypes: ["trend", "articles"],
});
assert.equal(userQuery.query, "파주 신혼가구 트렌드");
assert.equal(userQuery.querySource, "user");
assert.deepEqual(userQuery.types, ["trend", "articles"]);
assert.equal(userQuery.typesSource, "user");

console.log("OK: resolveResearchQueryAndTypes — user query/types wired");
