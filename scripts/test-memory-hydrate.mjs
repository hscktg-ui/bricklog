import assert from "node:assert/strict";
import {
  channelPackFromPipeline,
  pipelineContentFromMemoryItem,
} from "../lib/memory/contentStore.js";

const place = {
  title: "평택 템퍼 방문 안내",
  shortNotice: "체험 가능",
  body: "모션베드 상담 안내",
  hashtags: ["#평택"],
};

const pack = channelPackFromPipeline("place", place, {});
assert.ok(pack.promptInput?.structured_content?.title === place.title);

const item = {
  channel: "place",
  title: pack.title,
  full_content: pack.fullContent,
  prompt_input: pack.promptInput,
};
const restored = pipelineContentFromMemoryItem("place", item);
assert.equal(restored.title, place.title);
assert.equal(restored.body, place.body);

console.log("OK: memory hydrate roundtrip");
