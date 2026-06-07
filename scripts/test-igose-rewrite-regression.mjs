/**
 * Regression: rewriteEngine must not inject boundary 이곳 corruption.
 */
import assert from "node:assert/strict";
import { runRewrite } from "../lib/rewrite/rewriteEngine.js";

const sample =
  "아침에 일어나면 허리가 먼저 아픈 사람들이 있다. 침대를 바꿀지 말지부터 고민이 길어진다.";
const title =
  "광교에서 로얄에이스 매트리스 라인업 소개를 바라보는 시선, 에이스침대 광교";

const pack = {
  title,
  representativeTitle: title,
  sections: [{ heading: "test", body: sample }],
};

const ctx = {
  brandName: "에이스침대",
  region: "광교",
  input: {
    brandName: "에이스침대",
    region: "광교",
    topic: "로얄에이스 매트리스 라인업 소개",
    mainKeyword: "로얄에이스 매트리스",
  },
};

const { pack: out } = runRewrite(
  "blog",
  pack,
  "키워드 반복 줄여줘",
  ctx,
  "all",
  ["repeat"]
);

const full = [out.title, ...(out.sections || []).map((s) => s.body)].join("\n");
const corrupt = (full.match(/[가-힣]이곳[가-힣]/g) || []).length;

assert.equal(
  corrupt,
  0,
  `expected no boundary 이곳 corruption, got ${corrupt}: ${full.slice(0, 120)}`
);

console.log("OK: rewrite less_kw does not inject 이곳 corruption");
