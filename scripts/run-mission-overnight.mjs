/**
 * 야간 Mission 배치 — 20분 간격 자동 재실행 (LLM 없음, 승인 팝업 없음)
 * Run: npm run mission:overnight
 */
import { runMissionImprovementBatch } from "./mission-improvement-batch.mjs";

const INTERVAL_MS = Number(process.env.MISSION_BATCH_INTERVAL_MS || 20 * 60 * 1000);
const MAX_RUNS = Number(process.env.MISSION_BATCH_MAX_RUNS || 24);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

console.log(
  `[mission-overnight] start — ${MAX_RUNS} runs max, interval ${Math.round(INTERVAL_MS / 60000)}m`
);

for (let i = 0; i < MAX_RUNS; i++) {
  console.log(`\n[mission-overnight] === run ${i + 1}/${MAX_RUNS} ${new Date().toLocaleString("ko-KR")} ===`);
  try {
    const summary = runMissionImprovementBatch({ append: i > 0 });
    console.log(
      `[mission-overnight] done pass=${summary.pass}/${summary.total} (${summary.passRate}%)`
    );
  } catch (err) {
    console.error("[mission-overnight] error:", err?.message || err);
  }
  if (i < MAX_RUNS - 1) {
    await sleep(INTERVAL_MS);
  }
}

console.log("[mission-overnight] finished all scheduled runs");
