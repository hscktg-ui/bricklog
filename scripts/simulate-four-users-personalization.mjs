/**
 * 4 가상 유저 — 개인화·브랜드 프롬프트·작업실 초안 기록 호환
 * Run: npm run test:users
 */

import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  VIRTUAL_USERS,
  simulateLayersForVirtualUser,
} from "../lib/persona/virtualUsers.js";
import { applyPersonalizationToContext } from "../lib/llm/personalizationPrompt.js";
import { buildPersonalizationUserAddon } from "../lib/llm/personalizationPrompt.js";
import { personalizationBriefFromProfile } from "../lib/auth/profilePersonalization.js";
import { defaultMenuFromProfile } from "../lib/auth/profilePersonalization.js";
import { itemsFromBrandArchive } from "../lib/growth/brandArchiveHistory.js";
import { mergeDraftHistoryItems } from "../lib/growth/mergeDraftHistoryItems.js";
import { buildSidebarPersonalization } from "../lib/dashboard/sidebarPersonalization.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function mockArchiveAfterSaves(brandId, saves) {
  const archive = { blog: [], place: [], insta: [] };
  for (const s of saves) {
    archive[s.channel].push({
      at: s.at || new Date().toISOString(),
      text: s.text,
      versionSource: s.versionSource,
    });
  }
  return archive;
}

const results = [];
const addons = new Set();

for (const vu of VIRTUAL_USERS) {
  const row = { id: vu.id, label: vu.label, checks: [], pass: true };
  try {
    const layers = simulateLayersForVirtualUser(vu);
    addons.add(layers.combinedPromptAddon);

    assert(layers.accountBrief.includes("운영") || layers.accountBrief.length > 0, "accountBrief");
    assert(layers.userBrief.length > 10, "userBrief");
    assert(
      layers.brandBrief.length > 5 &&
        (layers.brandBrief.includes("톤") ||
          layers.brandBrief.includes("수정") ||
          layers.brandBrief.includes("금지")),
      "brandBrief habits"
    );
    assert(
      layers.combinedPromptAddon.includes("【USER MEMORY】"),
      "USER MEMORY block"
    );
    assert(
      layers.combinedPromptAddon.includes("【BRAND MEMORY】"),
      "BRAND MEMORY block"
    );

    const ctx = applyPersonalizationToContext(
      { brandName: vu.brand.brandName },
      layers
    );
    assert(ctx.accountBrief?.length > 0, "ctx.accountBrief injected");
    assert(
      ctx.personalizationAddon?.includes("【브랜드") ||
        ctx.personalizationAddon?.includes(vu.brand.rewriteHints?.slice(0, 8) || "톤"),
      "ctx addon has brand layer"
    );

    const addon = buildPersonalizationUserAddon(ctx);
    assert(
      addon.includes("【USER MEMORY】") || addon.includes("【BRAND MEMORY】"),
      "brand memory addon blocks"
    );

    const profileBrief = personalizationBriefFromProfile(vu.profile);
    assert(profileBrief.length > 0, "profile brief");
    const menu = defaultMenuFromProfile(vu.profile);
    assert(["blog", "place", "insta", "image"].includes(menu), "default menu");

    const sidebar = buildSidebarPersonalization(vu.profile, vu.brand, {
      primaryChannel: vu.profile.primaryUseCase === "instagram" ? "insta" : vu.profile.primaryUseCase === "place" ? "place" : "blog",
    });
    assert(sidebar.insightLine?.length > 5, "sidebar insight");

    const archive = mockArchiveAfterSaves(vu.brand.id, [
      { channel: "blog", text: `${vu.brand.brandName} 블로그 초안`, versionSource: "generate" },
      { channel: "place", text: `${vu.brand.brandName} 플레이스 공지`, versionSource: "paste_review_improve" },
      { channel: "insta", text: `${vu.brand.brandName} 인스타 캡션`, versionSource: "paste_review_refine" },
    ]);
    const archiveItems = itemsFromBrandArchive(archive, { brandId: vu.brand.id });
    assert(archiveItems.length === 3, "archive 3 channels");

    const memoryItems = [
      {
        id: `mem-${vu.id}-1`,
        brand_id: vu.brand.id,
        channel: "blog",
        title: "memory blog",
        full_content: "서버 memory 블로그",
        created_at: new Date().toISOString(),
      },
    ];
    const merged = mergeDraftHistoryItems(memoryItems, archiveItems);
    assert(merged.length === 4, "merge memory+archive without dup");

    row.checks.push("personalization", "sidebar", "archive", "merge");
  } catch (e) {
    row.pass = false;
    row.error = e.message;
  }
  results.push(row);
}

const distinctAddons = addons.size;
const passed = results.filter((r) => r.pass).length;

try {
  mkdirSync(join(root, "config", "persona-journey"), { recursive: true });
  writeFileSync(
    join(root, "config", "persona-journey", "four-users-report.json"),
    JSON.stringify(
      { passed, total: results.length, distinctAddons, results },
      null,
      2
    ),
    "utf8"
  );
} catch {
  /* ignore */
}

console.log("=== 4인 가상 유저 · 개인화·작업실 호환 ===\n");
console.log(`통과 ${passed}/${results.length} · 서로 다른 프롬프트 블록 ${distinctAddons}종\n`);

for (const r of results) {
  console.log(`${r.pass ? "✓" : "✗"} ${r.label}`);
  if (r.checks?.length) console.log(`  ${r.checks.join(", ")}`);
  if (r.error) console.log(`  오류: ${r.error}`);
}

assert(distinctAddons === VIRTUAL_USERS.length, "each user must have unique combined addon");
assert(passed === VIRTUAL_USERS.length, "all virtual users must pass");

console.log("\nOK — 계정·브랜드 개인화 분리 및 초안 기록 병합 호환");
process.exit(0);
