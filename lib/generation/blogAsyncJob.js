/**
 * 블로그 async 생성 job — Supabase 우선, 메모리 폴백
 */
import { randomUUID } from "crypto";
import { BRICLOG_TIMING_DEFAULTS } from "@/lib/config/briclogDefaults";
import {
  insertBlogJob,
  fetchBlogJob,
  claimBlogJobRun,
  completeBlogJobRow,
  failBlogJobRow,
  pruneExpiredBlogJobs,
  isMissingBlogJobTable,
} from "@/lib/generation/blogAsyncJobDb";

const STORE_KEY = "__BRICLOG_BLOG_ASYNC_JOBS__";

function getMemoryStore() {
  if (!globalThis[STORE_KEY]) {
    globalThis[STORE_KEY] = new Map();
  }
  return globalThis[STORE_KEY];
}

function pruneMemoryStore(store) {
  const now = Date.now();
  for (const [id, job] of store.entries()) {
    if (now - job.createdAt > BRICLOG_TIMING_DEFAULTS.asyncJobTtlMs) {
      store.delete(id);
    }
  }
}

function memoryCreate({ userId, rawInput, planId }) {
  const store = getMemoryStore();
  pruneMemoryStore(store);
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
    persisted: false,
  };
  store.set(id, job);
  return job;
}

function memoryGet(jobId, userId) {
  const job = getMemoryStore().get(jobId);
  if (!job || job.userId !== userId) return null;
  return job;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient|null} supabase
 */
export async function createBlogAsyncJob({ supabase, userId, rawInput, planId }) {
  if (supabase) {
    try {
      await pruneExpiredBlogJobs(supabase, userId);
      return await insertBlogJob(supabase, { userId, rawInput, planId });
    } catch (err) {
      if (!isMissingBlogJobTable(err)) throw err;
    }
  }
  return memoryCreate({ userId, rawInput, planId });
}

export async function getBlogAsyncJob({ supabase, jobId, userId }) {
  if (supabase) {
    try {
      const job = await fetchBlogJob(supabase, jobId, userId);
      if (job) return job;
    } catch (err) {
      if (!isMissingBlogJobTable(err)) throw err;
    }
  }
  return memoryGet(jobId, userId);
}

export async function markBlogAsyncJobRunning({ supabase, jobId, userId }) {
  if (supabase) {
    try {
      const claimed = await claimBlogJobRun(supabase, jobId, userId);
      if (claimed) return claimed;
      const existing = await fetchBlogJob(supabase, jobId, userId);
      if (existing) return existing.running ? null : existing;
    } catch (err) {
      if (!isMissingBlogJobTable(err)) throw err;
    }
  }
  const job = memoryGet(jobId, userId);
  if (!job || job.status !== "pending" || job.running) return job?.running ? null : job;
  job.running = true;
  job.status = "running";
  job.updatedAt = Date.now();
  return job;
}

export async function completeBlogAsyncJob({
  supabase,
  jobId,
  userId,
  resultBody,
}) {
  if (supabase) {
    try {
      return await completeBlogJobRow(supabase, jobId, userId, resultBody);
    } catch (err) {
      if (!isMissingBlogJobTable(err)) throw err;
    }
  }
  const job = memoryGet(jobId, userId);
  if (!job) return null;
  job.status =
    resultBody?.ok === false && !resultBody?.blogContent?.sections?.length
      ? "failed"
      : "done";
  job.result = resultBody;
  job.running = false;
  job.updatedAt = Date.now();
  return job;
}

export async function failBlogAsyncJob({ supabase, jobId, userId, message }) {
  if (supabase) {
    try {
      return await failBlogJobRow(supabase, jobId, userId, message);
    } catch (err) {
      if (!isMissingBlogJobTable(err)) throw err;
    }
  }
  const job = memoryGet(jobId, userId);
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
    persisted: Boolean(job.persisted),
    hasResult: Boolean(job.result),
    sectionCount: job.result?.blogContent?.sections?.length || 0,
    userMessage: job.result?.userMessage || job.error || null,
  };
}
