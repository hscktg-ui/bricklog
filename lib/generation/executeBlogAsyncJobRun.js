/**
 * Async blog job — background generation (after() worker)
 */
import { runBlogApiGeneration } from "@/lib/generation/blogApiHandler";
import {
  completeBlogAsyncJob,
  failBlogAsyncJob,
} from "@/lib/generation/blogAsyncJob";

/**
 * @param {object} opts
 * @param {import('@supabase/supabase-js').SupabaseClient} opts.supabase
 * @param {string} opts.userId
 * @param {string} opts.jobId
 * @param {object} opts.rawInput
 * @param {string} [opts.planId]
 * @param {string} [opts.route]
 */
export async function executeBlogAsyncJobRun(opts = {}) {
  const {
    supabase,
    userId,
    jobId,
    rawInput,
    planId,
    route = `/api/content/blog/async/${jobId}/run`,
  } = opts;

  if (!supabase || !userId || !jobId) {
    throw new Error("async_run_missing_context");
  }

  const auth = {
    supabase,
    user: { id: userId },
  };

  try {
    const { body } = await runBlogApiGeneration(auth, rawInput, {
      route,
      planId,
    });
    await completeBlogAsyncJob({
      supabase,
      jobId,
      userId,
      resultBody: body,
    });
    return { ok: true, body };
  } catch (err) {
    await failBlogAsyncJob({
      supabase,
      jobId,
      userId,
      message: err?.message || "server_error",
    });
    return { ok: false, error: err };
  }
}
