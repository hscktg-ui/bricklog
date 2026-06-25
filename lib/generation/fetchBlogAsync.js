/**
 * Async blog generation — start → fire run → poll (서버 타임아웃·불안정 완화)
 */
import { getAccessToken } from "@/lib/api/clientAuth";
import {
  getDefaultAsyncPollIntervalMs,
  isDefaultAsyncBlogGeneration,
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

/**
 * @param {object} payload slim blog api payload
 * @param {{ signal?: AbortSignal }} [opts]
 */
export async function generateBlogPipelineAsyncJob(payload, opts = {}) {
  const signal = opts.signal;
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
  const deadline = Date.now() + BRICLOG_TIMING_DEFAULTS.launchClientFetchMs;
  let polls = 0;

  while (Date.now() < deadline) {
    if (signal?.aborted) {
      const err = new Error("generation_aborted");
      err.code = "GENERATION_ABORTED";
      throw err;
    }
    await sleep(pollInterval);
    polls += 1;

    if (polls === 2 || polls === 6 || polls === 12) {
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
  throw err;
}

export function shouldUseAsyncBlogPipeline() {
  if (typeof window === "undefined") return false;
  return isDefaultAsyncBlogGeneration();
}
