/**
 * 여주 햅쌀 샘플: HTML 출고 vs 구 PNG 스택 문제 대조.
 */
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { buildDetailPagePublicSample } from "../lib/product/detailPagePublicSample.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "artifacts", "detail-page-commerce-compare");
mkdirSync(outDir, { recursive: true });

const rice = buildDetailPagePublicSample("open-rice");
const html = rice.documentHtml;
const pack = rice.pack;
const srcs = [...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1]);
const uniqueSrc = new Set(srcs);

function count(re) {
  return (html.match(re) || []).length;
}

const checks = {
  h1: count(/<h1[\s>]/g),
  h2: count(/<h2[\s>]/g),
  table: count(/<table[\s>]/g),
  dl: count(/<dl[\s>]/g),
  button: html.includes("구매하기"),
  missingPrice: html.includes("[자료 필요: 가격]"),
  abstractScream: /크게 외치지 않습니다|기준만 챙기면 됩니다/.test(html),
  deliverableHtml: html.includes('data-deliverable="html"'),
  imageStack: html.includes('data-deliverable="image-stack"'),
  notice: pack.sections.some((s) => s.type === "notice"),
  riceGrainBrief: String(
    pack.sections.find((s) => s.type === "observe")?.imageBrief?.prompt || ""
  ).includes("쌀알"),
  cookedRiceBrief: String(
    pack.sections.find((s) => s.type === "scene")?.imageBrief?.prompt || ""
  ).includes("밥"),
  uniquePhotos: uniqueSrc.size,
  photoRepeat: srcs.length > 1 && uniqueSrc.size < srcs.length,
  critique: pack._meta?.critique?.total ?? 0,
  invented: pack._meta?.critique?.invented === true,
  missingRequired: pack._meta?.facts?.missingRequired || [],
};

const summary = {
  generatedAt: new Date().toISOString(),
  versusOldPngStack: {
    old: "860 PNG 10장 스택, DOM 텍스트 없음, 같은 포장 반복, 추상 카피, FAQ·CTA 없음",
    now: "HTML 제목·표·FAQ·CTA, 포장 1장만, 없는 값은 [자료 필요], 검수 75+",
  },
  checks,
  pass:
    checks.h1 === 1 &&
    checks.table >= 1 &&
    checks.dl >= 1 &&
    checks.button &&
    checks.missingPrice &&
    !checks.abstractScream &&
    checks.deliverableHtml &&
    !checks.imageStack &&
    checks.notice &&
    checks.riceGrainBrief &&
    !checks.photoRepeat &&
    checks.critique >= 75 &&
    !checks.invented,
};

writeFileSync(join(outDir, "latest.json"), JSON.stringify(summary, null, 2));
writeFileSync(join(outDir, "rice.html"), html);
console.log(JSON.stringify(summary, null, 2));
if (!summary.pass) process.exit(1);
