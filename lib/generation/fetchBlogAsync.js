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

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs || BRICLOG_TIMING_DEFAULTS.asyncStartTimeoutMs;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
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

/**
 * @param {object} payload slim blog api payload
 */
export async function generateBlogPipelineAsyncJob(payload) {
  const start = await fetchJson("/api/content/blog/async/start", {
    method: "POST",
    body: JSON.stringify(payload),
    timeoutMs: BRICLOG_TIMING_DEFAULTS.asyncStartTimeoutMs,
  });

  const jobId = start.jobId;
  const pollUrl = start.pollUrl || `/api/content/blog/async/${jobId}`;
  const runUrl = start.runUrl || `/api/content/blog/async/${jobId}/run`;

  fetchJson(runUrl, {
    method: "POST",
    body: JSON.stringify({}),
    timeoutMs: BRICLOG_TIMING_DEFAULTS.launchClientFetchMs,
  }).catch(() => {
    /* run은 백그라운드 — poll이 완료를 받음 */
  });

  const pollInterval = start.pollIntervalMs || getDefaultAsyncPollIntervalMs();
  const deadline = Date.now() + BRICLOG_TIMING_DEFAULTS.launchClientFetchMs;

  while (Date.now() < deadline) {
    await sleep(pollInterval);
    const snap = await fetchJson(pollUrl, {
      method: "GET",
      timeoutMs: BRICLOG_TIMING_DEFAULTS.asyncStartTimeoutMs,
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
