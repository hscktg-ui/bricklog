/**
 * Async blog job — background scheduling (Vercel waitUntil / Next after)
 */
import { waitUntil } from "@vercel/functions";
import { after } from "next/server";
import { executeBlogAsyncJobRun } from "@/lib/generation/executeBlogAsyncJobRun";

/**
 * @param {Parameters<typeof executeBlogAsyncJobRun>[0]} runCtx
 */
export function scheduleBlogAsyncJobRun(runCtx) {
  const task = () =>
    executeBlogAsyncJobRun(runCtx).catch((err) => {
      console.error("[blog-async-run] background failed", err?.message || err);
    });

  try {
    waitUntil(task());
    return "waitUntil";
  } catch (waitErr) {
    console.warn("[blog-async-run] waitUntil unavailable", waitErr?.message || waitErr);
  }

  try {
    after(task());
    return "after";
  } catch (afterErr) {
    console.warn("[blog-async-run] after unavailable", afterErr?.message || afterErr);
  }

  return null;
}

/**
 * Last-resort — caller keeps connection open (probe / sync clients).
 * @param {Parameters<typeof executeBlogAsyncJobRun>[0]} runCtx
 */
export async function runBlogAsyncJobInline(runCtx) {
  return executeBlogAsyncJobRun(runCtx);
}
