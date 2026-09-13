import assert from "node:assert/strict";
import { sanitizeDetailPageAstroInput } from "../lib/product/detailPageAstroPolicy.js";

const blocked = sanitizeDetailPageAstroInput(
  {
    sourceChannel: "blog",
    continuityCopy: "",
    detailPageAstro: {
      enabled: true,
      anchorTypes: ["hero", "cta"],
      continuity: "강제 주입",
    },
  },
  "generate"
);

assert.equal(blocked.sourceChannel, "");
assert.equal(blocked.continuityCopy, "");
assert.equal(blocked.detailPageAstro, undefined);

const allowed = sanitizeDetailPageAstroInput(
  {
    sourceChannel: "blog",
    continuityCopy: "이 브랜드에 쌓인 기록은 계속 이어집니다",
    detailPageAstro: {
      enabled: true,
      anchorTypes: ["hero", "cta"],
      continuity: "강제 주입",
    },
  },
  "generate"
);

assert.equal(allowed.sourceChannel, "blog");
assert.equal(
  allowed.continuityCopy,
  "이 브랜드에 쌓인 기록은 계속 이어집니다"
);
assert.equal(allowed.detailPageAstro, undefined);

const improve = sanitizeDetailPageAstroInput(
  {
    sourceChannel: "blog",
    continuityCopy: "이 브랜드에 쌓인 기록은 계속 이어집니다",
  },
  "improve"
);

assert.equal(improve.sourceChannel, "");
assert.equal(improve.continuityCopy, "");

console.log("ok detail-page-api-route astro-minimal");
