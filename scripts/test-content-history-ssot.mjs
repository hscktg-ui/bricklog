/**
 * 브랜드 글 기록 SSOT
 * Run: npm run test:content-history-ssot
 */
import { mergeDraftHistoryItems } from "../lib/growth/mergeDraftHistoryItems.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const memory = [
  {
    id: "m1",
    channel: "blog",
    title: "아침 커피",
    created_at: "2026-06-23T10:00:00.000Z",
    full_content: "본문 A",
  },
];

const archive = [
  {
    id: "a1",
    channel: "blog",
    title: "아침 커피",
    created_at: "2026-06-23T09:00:00.000Z",
    full_content: "본문 A",
  },
  {
    id: "a2",
    channel: "place",
    title: "플레이스",
    created_at: "2026-06-22T10:00:00.000Z",
    full_content: "플레이스 본문",
  },
];

const merged = mergeDraftHistoryItems(memory, archive);
assert(merged.length === 2, "dedupe same blog");
assert(merged[0].id === "m1", "memory wins sort");

console.log("PASS: content-history-ssot");
