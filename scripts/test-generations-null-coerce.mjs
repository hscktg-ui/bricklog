/**
 * generations insert — null channel columns → '' (NOT NULL constraint)
 */
import assert from "node:assert/strict";
import { serializeContent } from "../lib/contentFormat.js";

function generationText(value) {
  if (value == null) return "";
  return typeof value === "string" ? value : String(value);
}

const blogOnlyRow = {
  blog: serializeContent({ title: "t", sections: [] }),
  place: null,
  instagram: null,
  hashtags: null,
  image_prompt: null,
};

assert.equal(generationText(blogOnlyRow.place), "");
assert.equal(generationText(blogOnlyRow.instagram), "");
assert.equal(generationText(blogOnlyRow.hashtags), "");
assert.equal(generationText(blogOnlyRow.image_prompt), "");
assert.equal(generationText(undefined), "");

console.log("OK test-generations-null-coerce");
