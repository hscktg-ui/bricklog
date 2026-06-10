/**
 * Blog API delivery gate — draft_fallback + eval fail must withhold when reset quality on.
 */
import assert from "node:assert/strict";
import { alignBlogApiDeliveryResponse } from "../lib/product/blogApiDeliveryGate.js";

const prev = process.env.BRICLOG_RESET_QUALITY;
process.env.BRICLOG_RESET_QUALITY = "true";

try {
  const pack = {
    title: "테스트",
    sections: [{ heading: "소개", body: "본문입니다. " + "가나다라 ".repeat(40) }],
    _meta: {
      contentEvaluation: { pass: false, shouldWithhold: true, score: 72 },
      outputWithheld: false,
    },
  };

  const aligned = alignBlogApiDeliveryResponse(
    { ok: true, withheld: false, mode: "llm", blogContent: pack },
    { brandName: "테스트샵", region: "서울" }
  );
  assert.equal(aligned.ok, false);
  assert.equal(aligned.withheld, true);

  const draftAligned = alignBlogApiDeliveryResponse(
    {
      ok: true,
      withheld: false,
      mode: "draft_fallback",
      blogContent: {
        ...pack,
        _meta: { ...pack._meta, contentEvaluation: { pass: true, shouldWithhold: false, score: 95 } },
      },
    },
    { brandName: "테스트샵" }
  );
  assert.equal(draftAligned.ok, false);
  assert.equal(draftAligned.withheld, true);

  console.log("test-blog-api-delivery-gate: PASS");
} finally {
  if (prev === undefined) delete process.env.BRICLOG_RESET_QUALITY;
  else process.env.BRICLOG_RESET_QUALITY = prev;
}
