/**
 * Async blog job — background scheduling (dynamic import — route cold-start safe)
 */

/**
 * @param {import("@/lib/generation/executeBlogAsyncJobRun").executeBlogAsyncJobRun extends (...args: infer A) => unknown ? A[0] : never} runCtx
 */
export async function scheduleBlogAsyncJobRun(runCtx) {
  const task = async () => {
    const { executeBlogAsyncJobRun } = await import(
      "@/lib/generation/executeBlogAsyncJobRun"
    );
    return executeBlogAsyncJobRun(runCtx).catch((err) => {
      console.error("[blog-async-run] background failed", err?.message || err);
    });
  };

  try {
    const { waitUntil } = await import("@vercel/functions");
    const promise = task();
    const ret = waitUntil(promise);
    if (ret !== undefined) return "waitUntil";
    await promise;
    return "inline";
  } catch (waitErr) {
    console.warn("[blog-async-run] waitUntil failed", waitErr?.message || waitErr);
  }

  try {
    const { after } = await import("next/server");
    after(task());
    return "after";
  } catch (afterErr) {
    console.warn("[blog-async-run] after failed", afterErr?.message || afterErr);
  }

  return null;
}

/**
 * @param {Parameters<typeof import("@/lib/generation/executeBlogAsyncJobRun").executeBlogAsyncJobRun>[0]} runCtx
 */
export async function runBlogAsyncJobInline(runCtx) {
  const { executeBlogAsyncJobRun } = await import(
    "@/lib/generation/executeBlogAsyncJobRun"
  );
  return executeBlogAsyncJobRun(runCtx);
}
