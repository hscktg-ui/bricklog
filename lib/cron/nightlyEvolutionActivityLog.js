/**
 * 야간 자동화 단계별 진행·마무리 기록 (관리자 상태 패널용)
 */
import fs from "fs";
import path from "path";
import { safeLocalCronWrite } from "@/lib/cron/localArtifacts";

const DATA_DIR = path.join(process.cwd(), ".data", "nightly-evolution");
const LATEST_FILE = path.join(DATA_DIR, "activity-latest.json");
const MAX_EVENTS = 40;

/** @type {{ runId: string|null, startedAt: string|null, finishedAt: string|null, status: string, events: object[] } | null} */
let memoryState = null;

function ensureDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadFromDisk() {
  return safeLocalCronWrite(() => {
    if (!fs.existsSync(LATEST_FILE)) return null;
    try {
      return JSON.parse(fs.readFileSync(LATEST_FILE, "utf8"));
    } catch {
      return null;
    }
  });
}

function persist(state) {
  memoryState = state;
  safeLocalCronWrite(() => {
    ensureDir();
    fs.writeFileSync(LATEST_FILE, JSON.stringify(state, null, 2), "utf8");
  });
}

export function getNightlyEvolutionActivityLog() {
  if (memoryState) return memoryState;
  const disk = loadFromDisk();
  if (disk) memoryState = disk;
  return memoryState || { events: [], status: "idle" };
}

/**
 * @param {"started"|"progress"|"finished"|"skipped"|"error"} phase
 * @param {string} message
 * @param {object} [detail]
 */
export function appendNightlyEvolutionEvent(phase, message, detail = {}) {
  const prev = getNightlyEvolutionActivityLog();
  const event = {
    at: new Date().toISOString(),
    phase,
    message,
    ...detail,
  };
  const events = [...(prev.events || []), event].slice(-MAX_EVENTS);
  const next = {
    ...prev,
    events,
    lastEventAt: event.at,
    lastMessage: message,
    lastPhase: phase,
  };
  persist(next);
  return event;
}

/** 새 야간 배치 시작 */
export function beginNightlyEvolutionRun() {
  const runId = `nightly-${Date.now()}`;
  const state = {
    runId,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    status: "running",
    events: [],
  };
  persist(state);
  appendNightlyEvolutionEvent("started", "야간 자동화를 시작했습니다.", { step: "pipeline" });
  return runId;
}

/**
 * @param {object} result — runNightlyEvolutionPipeline 반환값
 */
export function finishNightlyEvolutionRun(result = {}) {
  const prev = getNightlyEvolutionActivityLog();
  const ok = result.ok !== false;
  const state = {
    ...prev,
    finishedAt: new Date().toISOString(),
    status: ok ? "finished" : "error",
    resultSummary: {
      insightsSuggested: result.insights?.suggestions ?? null,
      insightsInserted: result.insights?.inserted ?? null,
      insightsApproved: result.approved?.approved ?? null,
      qualityProcessed: result.quality?.processed ?? null,
      qualityAvgScore: result.quality?.avgScore ?? null,
      labProcessed: result.lab?.processed ?? null,
      labPassRate: result.lab?.passRate ?? null,
    },
  };
  persist(state);
  appendNightlyEvolutionEvent(
    ok ? "finished" : "error",
    ok ? "야간 자동화를 마무리했습니다." : "야간 자동화 중 오류가 발생했습니다.",
    { step: "pipeline", ok }
  );
  return state;
}
