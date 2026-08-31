import assert from "node:assert/strict";
import { isGrokConfigured } from "../lib/llm/grokClient.js";
import {
  isDirectedDetailPack,
  stampGrokArtOnPack,
} from "../lib/product/detailPageGrokDirector.js";
import { applyDirectedSample } from "../lib/product/detailPageDirectedSample.js";

process.env.XAI_API_KEY = "";
process.env.GROK_API_KEY = "";

assert.equal(isGrokConfigured(), false, "unit test must not require XAI_API_KEY");

assert.equal(isDirectedDetailPack({ _meta: { mode: "fallback" } }), false);
assert.equal(isDirectedDetailPack({ _meta: { mode: "llm" } }), true);
assert.equal(isDirectedDetailPack({ _meta: { mode: "directed" } }), true);
assert.equal(isDirectedDetailPack({ _meta: { director: { gpt: true } } }), true);

const skipped = await stampGrokArtOnPack({
  sections: [{ type: "hero", title: "밥" }],
  _meta: { mode: "llm" },
});
assert.equal(skipped.grok, false);
assert.equal(skipped.skipped, "no_grok");
assert.equal(skipped.pack._meta.director.gpt, true);

const applied = applyDirectedSample(
  {
    sections: [
      { type: "hero", title: "폴백" },
      { type: "intent", title: "가늠이 안 된다" },
    ],
    _meta: { mode: "fallback" },
  },
  {
    id: "open-rice",
    sections: [{ type: "intent", title: "여주 햅쌀", body: "진상 · 당일 도정" }],
  }
);
assert.equal(applied.sections[1].title, "여주 햅쌀");
assert.equal(applied._meta.mode, "directed");
assert.equal(isDirectedDetailPack(applied), true);

console.log("ok detail-page-director grok=off overlay=directed");
