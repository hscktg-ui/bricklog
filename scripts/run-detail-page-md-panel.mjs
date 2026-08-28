/**
 * 공개 쌀·원두 샘플을 쇼핑몰 MD 20인이 평가한다.
 * 디자이너 패널과 달리 가격·컷·자료 공란이 있으면 탈락한다.
 */
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { buildDetailPagePublicSample } from "../lib/product/detailPagePublicSample.js";
import { inspectDetailPageFacts } from "../lib/product/detailPageFactDossier.js";
import { evaluateDetailPageMallMdPanel } from "../lib/qa/detailPageMallMdPanel20.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const OUT_DIR = join(root, "artifacts", "detail-page-md-panel");

function evalSample(id) {
  const sample = buildDetailPagePublicSample(id);
  const dossier = inspectDetailPageFacts(sample.pack);
  const panel = evaluateDetailPageMallMdPanel({
    pack: sample.pack,
    html: sample.html,
    dossier,
  });
  return {
    id,
    productName: sample.pack.productName,
    engine: sample.pack._meta?.sqv?.score ?? null,
    designerSuccess: sample.success?.score ?? null,
    critique: sample.pack._meta?.critique?.total ?? null,
    imgs: panel.measured.imgs,
    needCount: panel.measured.needCount,
    vetoes: panel.measured.vetoes,
    axes: {
      sellability: panel.measured.sellability,
      firstScreen: panel.measured.firstScreen,
      skuFacts: panel.measured.skuFacts,
      photoCuts: panel.measured.photoCuts,
      vsRank: panel.measured.vsRank,
      conversion: panel.measured.conversion,
      trustGaps: panel.measured.trustGaps,
      repeat: panel.measured.repeat,
      categoryFit: panel.measured.categoryFit,
    },
    summary: panel.summary,
    votes: panel.votes,
  };
}

const rice = evalSample("open-rice");
const beans = evalSample("open-beans");
const report = {
  version: rice.summary ? undefined : undefined,
  generatedAt: new Date().toISOString(),
  panel: "mall-md-20-v1",
  brief: "스마트스토어·쿠팡 10년차 MD 20인. 오늘 이 리스팅을 올릴 수 있는가.",
  rice,
  beans,
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, "latest.json"), JSON.stringify(report, null, 2));
writeFileSync(
  join(OUT_DIR, "latest-summary.json"),
  JSON.stringify(
    {
      generatedAt: report.generatedAt,
      rice: {
        mean: rice.summary.mean,
        pass: `${rice.summary.passCount}/20`,
        hire: rice.summary.hireLabel,
        vetoes: rice.vetoes,
        engine: rice.engine,
      },
      beans: {
        mean: beans.summary.mean,
        pass: `${beans.summary.passCount}/20`,
        hire: beans.summary.hireLabel,
        vetoes: beans.vetoes,
        engine: beans.engine,
      },
    },
    null,
    2
  )
);

console.log(
  JSON.stringify(
    {
      rice: {
        mean: rice.summary.mean,
        pass: rice.summary.passCount,
        hire: rice.summary.hireLabel,
        vetoes: rice.vetoes,
        axes: rice.axes,
        lowest: rice.summary.lowest.map((v) => `${v.name} ${v.score}`),
      },
      beans: {
        mean: beans.summary.mean,
        pass: beans.summary.passCount,
        hire: beans.summary.hireLabel,
        vetoes: beans.vetoes,
        axes: beans.axes,
        lowest: beans.summary.lowest.map((v) => `${v.name} ${v.score}`),
      },
    },
    null,
    2
  )
);
