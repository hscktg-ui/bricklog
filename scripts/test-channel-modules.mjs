/**
 * 채널 모듈 스모크 테스트 (LLM 없음, @/ import 없음)
 * Run: node scripts/test-channel-modules.mjs
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function load(rel, names) {
  const src = readFileSync(join(root, rel), "utf8").replace(/^export /gm, "");
  // eslint-disable-next-line no-new-func
  return new Function(`${src}; return { ${names.join(", ")} };`)();
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const { CHANNEL_PRODUCTS, buildSidebarMenuSections, MAIN_CHANNEL_IDS, normalizeWorkspaceMenuId } = load(
  "lib/channels/channelProducts.js",
  ["CHANNEL_PRODUCTS", "buildSidebarMenuSections", "MAIN_CHANNEL_IDS", "normalizeWorkspaceMenuId"]
);

const channels = ["blog", "place", "insta", "image"];
for (const id of channels) {
  assert(CHANNEL_PRODUCTS[id], `CHANNEL_PRODUCTS.${id} missing`);
  assert(CHANNEL_PRODUCTS[id].generateLabel, `${id} generateLabel`);
}

const menu = buildSidebarMenuSections({ demoMode: false });
const menuIds = menu.flatMap((s) => s.items.map((i) => i.id));
for (const id of ["blog", "place", "insta", "image", "review", "history", "growth"]) {
  assert(menuIds.includes(id), `menu missing ${id}`);
}

for (const id of MAIN_CHANNEL_IDS) {
  assert(channels.includes(id) || id === "insta", `MAIN_CHANNEL_IDS ${id}`);
}

const minimal = { brandName: "테스트", region: "서울", topic: "오픈" };
const canGenerate =
  Boolean(minimal.brandName?.trim()) &&
  Boolean(minimal.region?.trim()?.length >= 2) &&
  Boolean(minimal.topic?.trim() || minimal.mainKeyword?.trim());
assert(canGenerate, "minimal form should allow generate");

assert(normalizeWorkspaceMenuId("instagram") === "insta", "instagram alias → insta");
assert(normalizeWorkspaceMenuId("insta") === "insta", "insta unchanged");

console.log("test-channel-modules: OK", channels.join(", "));
