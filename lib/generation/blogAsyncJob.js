/**
 * 블로그 async 생성 job — serverless 인스턴스 간 globalThis 공유
 */
import { randomUUID } from "crypto";
import { BRICLOG_TIMING_DEFAULTS } from "@/lib/config/briclogDefaults";

const STORE_KEY = "__BRICLOG_BLOG_ASYNC_JOBS__";

function getStore() {
  if (!globalThis[STORE_KEY]) {
    globalThis[STORE_KEY] = new Map();
  }
  return globalThis[STORE_KEY];
}

function pruneExpired(store) {
  const now = Date.now();
  for (const [id, job] of store.entries()) {
    if (now - job.createdAt > BRICLOG_TIMING_DEFAULTS.asyncJobTtlMs) {
      store.delete(id);
    }
  }
}

export function createBlogAsyncJob({ userId, rawInput, planId }) {
  const store = getStore();
  pruneExpired(store);
  const id = randomUUID();
  const job = {
    id,
    userId,
    rawInput,
    planId,
    status: "pending",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    result: null,
    error: null,
    running: false,
  };
  store.set(id, job);
  return job;
}

export function getBlogAsyncJob(jobId, userId) {
  const store = getStore();
  const job = store.get(jobId);
  if (!job || job.userId !== userId) return null;
  return job;
}

export function markBlogAsyncJobRunning(jobId, userId) {
  const job = getBlogAsyncJob(jobId, userId);
  if (!job || job.status !== "pending" || job.running) return null;
  job.running = true;
  job.status = "running";
  job.updatedAt = Date.now();
  return job;
}

export function completeBlogAsyncJob(jobId, userId, resultBody) {
  const job = getBlogAsyncJob(jobId, userId);
  if (!job) return null;
  job.status = resultBody?.ok === false && !resultBody?.blogContent?.sections?.length
    ? "failed"
    : "done";
  job.result = resultBody;
  job.running = false;
  job.updatedAt = Date.now();
  return job;
}

export function failBlogAsyncJob(jobId, userId, message) {
  const job = getBlogAsyncJob(jobId, userId);
  if (!job) return null;
  job.status = "failed";
  job.error = message;
  job.running = false;
  job.updatedAt = Date.now();
  return job;
}

export function blogAsyncJobSnapshot(job) {
  if (!job) return null;
  return {
    id: job.id,
    status: job.status,
    updatedAt: job.updatedAt,
    hasResult: Boolean(job.result),
    sectionCount: job.result?.blogContent?.sections?.length || 0,
    userMessage: job.result?.userMessage || job.error || null,
  };
}
