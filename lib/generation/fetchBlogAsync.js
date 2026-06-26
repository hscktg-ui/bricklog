/**
 * Async blog generation — start → fire run → poll (서버 타임아웃·불안정 완화)
 */
import { getAccessToken } from "@/lib/api/clientAuth";
import {
  getDefaultAsyncPollIntervalMs,
  isDefaultAsyncBlogGeneration,
  getAsyncBlogPollDeadlineMs,
  BRICLOG_TIMING_DEFAULTS,
} from "@/lib/config/briclogDefaults";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url, options = {}) {
  const token = await getAccessToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const outerSignal = options.signal;
  const controller = outerSignal ? null : new AbortController();
  const signal = outerSignal || controller?.signal;
  const timeoutMs = options.timeoutMs || BRICLOG_TIMING_DEFAULTS.asyncStartTimeoutMs;
  const timeoutId =
    controller && timeoutMs > 0
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.userMessage || data.message || "요청에 실패했습니다.");
      err.status = res.status;
      err.payload = data;
      throw err;
    }
    return data;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function triggerAsyncRun(runUrl, opts = {}) {
  try {
    return await fetchJson(runUrl, {
      method: "POST",
      body: JSON.stringify({}),
      timeoutMs: opts.timeoutMs || BRICLOG_TIMING_DEFAULTS.asyncStartTimeoutMs,
      signal: opts.signal,
    });
  } catch {
    return null;
  }
}

/** @param {number} polls poll count @ ~2s interval */
function maybeLongWaitHint(polls, onLongWait) {
  if (!onLongWait) return;
  if (polls === 30) onLongWait("조금 더 걸리고 있어요…");
  else if (polls === 60) onLongWait("거의 다 됐어요. 마무리 중…");
  else if (polls === 90) onLongWait("품질 검수 후 곧 보여드릴게요…");
}

/**
 * @param {object} payload slim blog api payload
 * @param {{ signal?: AbortSignal, onLongWait?: (label: string) => void }} [opts]
 */
export async function generateBlogPipelineAsyncJob(payload, opts = {}) {
  const signal = opts.signal;
  const onLongWait = opts.onLongWait;
  const start = await fetchJson("/api/content/blog/async/start", {
    method: "POST",
    body: JSON.stringify(payload),
    timeoutMs: BRICLOG_TIMING_DEFAULTS.asyncStartTimeoutMs,
    signal,
  });

  const jobId = start.jobId;
  const pollUrl = start.pollUrl || `/api/content/blog/async/${jobId}`;
  const runUrl = start.runUrl || `/api/content/blog/async/${jobId}/run`;

  await triggerAsyncRun(runUrl, {
    timeoutMs: BRICLOG_TIMING_DEFAULTS.asyncStartTimeoutMs,
    signal,
  });

  const pollInterval = start.pollIntervalMs || getDefaultAsyncPollIntervalMs();
  const deadline = Date.now() + getAsyncBlogPollDeadlineMs();
  let polls = 0;

  while (Date.now() < deadline) {
    if (signal?.aborted) {
      const err = new Error("generation_aborted");
      err.code = "GENERATION_ABORTED";
      throw err;
    }
    await sleep(pollInterval);
    polls += 1;
    maybeLongWaitHint(polls, onLongWait);

    if (polls === 2 || polls === 6 || polls === 12 || polls === 30 || polls === 60) {
      void triggerAsyncRun(runUrl, {
        timeoutMs: BRICLOG_TIMING_DEFAULTS.asyncStartTimeoutMs,
        signal,
      });
    }

    const snap = await fetchJson(pollUrl, {
      method: "GET",
      timeoutMs: BRICLOG_TIMING_DEFAULTS.asyncStartTimeoutMs,
      signal,
    });
    if (snap.status === "done" || snap.blogContent?.sections?.length) {
      return snap;
    }
    if (snap.status === "failed") {
      const err = new Error(snap.userMessage || "콘텐츠를 생성하지 못했습니다.");
      err.code = snap.mode || "generation_failed";
      err.payload = snap;
      throw err;
    }
  }

  const err = new Error("generation_timeout");
  err.code = "GENERATION_TIMEOUT";
  err.asyncJobId = jobId;
  throw err;
}

export function shouldUseAsyncBlogPipeline() {
  if (typeof window === "undefined") return false;
  return isDefaultAsyncBlogGeneration();
}
