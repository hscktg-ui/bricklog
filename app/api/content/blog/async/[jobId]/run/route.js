import { NextResponse } from "next/server";
import { after } from "next/server";
import { requireVerifiedUser } from "@/lib/api/auth";
import { hydrateGlobalEngineForGeneration } from "@/lib/feedback/feedbackEngineLoop";
import {
  getBlogAsyncJob,
  markBlogAsyncJobRunning,
  blogAsyncJobSnapshot,
} from "@/lib/generation/blogAsyncJob";
import { executeBlogAsyncJobRun } from "@/lib/generation/executeBlogAsyncJobRun";
import { createServiceSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
/** background after() worker — sync blog 와 동일 상한 */
export const maxDuration = 300;

export async function POST(request, { params }) {
  await hydrateGlobalEngineForGeneration();

  const auth = await requireVerifiedUser(request);
  if (auth.error) {
    return NextResponse.json(
      { ok: false, userMessage: auth.error.message },
      { status: auth.error.status }
    );
  }

  const { jobId } = await params;
  const job = await getBlogAsyncJob({
    supabase: auth.supabase,
    jobId,
    userId: auth.user.id,
  });
  if (!job) {
    return NextResponse.json(
      { ok: false, userMessage: "생성 작업을 찾을 수 없습니다. 다시 시도해 주세요." },
      { status: 404 }
    );
  }

  if (job.status === "done" && job.result) {
    return NextResponse.json({
      ok: true,
      mode: "async_job",
      jobId,
      snapshot: blogAsyncJobSnapshot(job),
      ...job.result,
    });
  }

  if (job.status === "failed") {
    return NextResponse.json(
      {
        ok: false,
        mode: "async_job",
        jobId,
        userMessage: job.error || job.result?.userMessage || "생성에 실패했습니다.",
        snapshot: blogAsyncJobSnapshot(job),
      },
      { status: 200 }
    );
  }

  if (job.running || job.status === "running") {
    return NextResponse.json({
      ok: true,
      mode: "async_job",
      jobId,
      status: "running",
      snapshot: blogAsyncJobSnapshot(job),
    });
  }

  const locked = await markBlogAsyncJobRunning({
    supabase: auth.supabase,
    jobId,
    userId: auth.user.id,
  });
  if (!locked || locked.status !== "running") {
    const current = await getBlogAsyncJob({
      supabase: auth.supabase,
      jobId,
      userId: auth.user.id,
    });
    return NextResponse.json({
      ok: true,
      mode: "async_job",
      jobId,
      status: current?.status || job.status,
      snapshot: blogAsyncJobSnapshot(current || job),
    });
  }

  const userId = auth.user.id;
  const bgSupabase = createServiceSupabase() || auth.supabase;
  const runCtx = {
    supabase: bgSupabase,
    userId,
    jobId,
    rawInput: locked.rawInput,
    planId: locked.planId,
    route: `/api/content/blog/async/${jobId}/run`,
  };

  after(async () => {
    await executeBlogAsyncJobRun(runCtx);
  });

  return NextResponse.json(
    {
      ok: true,
      mode: "async_job",
      jobId,
      status: "running",
      accepted: true,
      snapshot: blogAsyncJobSnapshot(locked),
    },
    { status: 202 }
  );
}
