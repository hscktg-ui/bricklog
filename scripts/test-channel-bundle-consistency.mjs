/**
 * 채널 3종 내용 일관성 — 브랜드·주제·블로그 복붙 감지
 * Run: npm run test:channel-bundle-consistency
 */
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assessChannelBundleConsistency,
  CHANNEL_BUNDLE_VERSION,
} from "../lib/product/channelBundleConsistency.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const brand = "산책카페";
const topic = "봄 시즌 브런치";
const region = "전주 한옥마을";

const blogPack = {
  sections: [
    { heading: "브런치", body: `${brand} ${topic} 메뉴를 소개합니다. `.repeat(30) },
    { heading: "안내", body: `${region} 매장 위치와 예약 방법.` },
  ],
};

const goodPlace = {
  title: `${brand} ${topic}`,
  shortNotice: `${brand} ${region} — ${topic} 예약·영업 안내`,
  detailBody: `${topic} 대표 메뉴와 픽업 시간을 안내합니다.`,
};

const goodInsta = {
  hook: `${brand} ${topic}`,
  body: `${region}에서 즐기는 ${topic} 한 장면`,
  hashtags: [brand, topic.replace(/\s/g, "")],
};

const good = assessChannelBundleConsistency({
  brandName: brand,
  topic,
  region,
  blogPack,
  placePack: goodPlace,
  instagramPack: goodInsta,
  visitToneAllowed: false,
});
assert.ok(good.ok, `good bundle: ${good.failReasons.join(",")}`);

const dumpPlace = {
  title: brand,
  shortNotice: "요약",
  detailBody: blogPack.sections.map((s) => s.body).join("\n"),
};
const dump = assessChannelBundleConsistency({
  brandName: brand,
  topic,
  region,
  blogPack,
  placePack: dumpPlace,
  instagramPack: goodInsta,
});
assert.ok(!dump.ok, "blog dump should fail");
assert.ok(dump.failReasons.includes("place_blog_dump"), dump.failReasons.join(","));

const visitPlace = {
  title: brand,
  shortNotice: `${brand} 직접 가봤어요`,
  detailBody: "솔직 후기입니다.",
};
const visit = assessChannelBundleConsistency({
  brandName: brand,
  topic,
  region,
  blogPack,
  placePack: visitPlace,
  instagramPack: goodInsta,
  visitToneAllowed: false,
});
assert.ok(visit.failReasons.includes("visit_leak_in_channels"), visit.failReasons.join(","));

const summary = {
  version: CHANNEL_BUNDLE_VERSION,
  at: new Date().toISOString(),
  cases: [
    { id: "good_bundle", ok: good.ok },
    { id: "blog_dump", ok: !dump.ok },
    { id: "visit_leak", ok: visit.failReasons.includes("visit_leak_in_channels") },
  ],
  pass: 3,
  total: 3,
};

const outDir = join(root, "artifacts", "channel-bundle-consistency");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "latest-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);

console.log("OK channel-bundle-consistency (3/3)");
console.log(`Report: ${join(outDir, "latest-summary.json")}`);
