/**
 * AUTO BAN ENGINE — 높은 삭제율 문장·패턴 전역 금지
 */
import { PADDING_PATTERN_RES, FICTION_EXPERIENCE_RES } from "@/lib/product/coreContentEngine";

export const AUTO_BAN_DELETE_THRESHOLD = 0.8;
export const AUTO_BAN_GLOBAL_THRESHOLD = 0.9;
export const AUTO_BAN_MIN_SAMPLES = 5;

/** 시드 금지 후보 — 삭제·피드백에서 빈도 집계 */
export const AUTO_BAN_SEED_PHRASES = [
  "퇴근길에 문득",
  "주말 아침 테이블",
  "기념일을 깜빡했다",
  "당일 상담 메모",
  "직접 다녀온",
  "솔직 후기",
  "누워보니",
  "확인해 확인해",
  "메모를 보강",
];

function phraseKey(text = "") {
  return String(text || "").trim().slice(0, 48);
}

/**
 * @param {Array<{ phrase: string, action: 'delete'|'rewrite'|'human_edit', count?: number }>} samples
 */
export function aggregatePhraseDeletionStats(samples = []) {
  const stats = new Map();
  for (const row of samples) {
    const key = phraseKey(row.phrase);
    if (!key || key.length < 4) continue;
    const cur = stats.get(key) || { phrase: key, delete: 0, total: 0 };
    cur.total += row.count ?? 1;
    if (row.action === "delete" || row.action === "human_edit") {
      cur.delete += row.count ?? 1;
    }
    stats.set(key, cur);
  }
  return [...stats.values()].map((s) => ({
    ...s,
    deleteRate: s.total ? s.delete / s.total : 0,
  }));
}

export function evaluateAutoBanCandidates(stats = []) {
  const record = [];
  const globalBan = [];
  for (const row of stats) {
    if (row.total < AUTO_BAN_MIN_SAMPLES) continue;
    if (row.deleteRate >= AUTO_BAN_DELETE_THRESHOLD) {
      record.push({
        phrase: row.phrase,
        deleteRate: row.deleteRate,
        samples: row.total,
        level: row.deleteRate >= AUTO_BAN_GLOBAL_THRESHOLD ? "global" : "watch",
      });
    }
    if (row.deleteRate >= AUTO_BAN_GLOBAL_THRESHOLD) {
      globalBan.push(row.phrase);
    }
  }
  return { record, globalBan };
}

export function detectBannedPhrasesInText(text = "") {
  const t = String(text || "");
  const hits = [];
  for (const seed of AUTO_BAN_SEED_PHRASES) {
    if (t.includes(seed)) hits.push({ phrase: seed, source: "seed" });
  }
  for (const re of [...PADDING_PATTERN_RES, ...FICTION_EXPERIENCE_RES]) {
    const m = t.match(re);
    if (m?.[0]) hits.push({ phrase: m[0], source: "pattern" });
  }
  return hits;
}
