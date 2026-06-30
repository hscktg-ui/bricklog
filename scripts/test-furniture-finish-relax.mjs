/**
 * 가구 finish 완화·OpenAI 쿼터 코드 회귀
 */
import assert from "node:assert/strict";
import { isColumnistFinishBenchRelaxed } from "../lib/product/columnistSovereignEngine.js";

process.env.BRICLOG_RESET_QUALITY = "true";

assert.equal(
  isColumnistFinishBenchRelaxed({
    brandName: "금성침대",
    industry: "침대·매트리스",
    topic: "김포 매트리스 추천",
  }),
  true
);

assert.equal(
  isColumnistFinishBenchRelaxed({
    brandName: "애월바다펜션",
    industry: "펜션",
    topic: "장박 할인, 직접 다녀왔어요",
  }),
  false,
  "visit review topic should not relax"
);

console.log("OK furniture-finish-relax");
