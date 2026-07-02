import { NextResponse } from "next/server";
import { requireVerifiedUser } from "@/lib/api/auth";
import { hydrateGlobalEngineForGeneration } from "@/lib/feedback/feedbackEngineLoop";
import {
  getBlogAsyncJob,
  markBlogAsyncJobRunning,
  blogAsyncJobSnapshot,
} from "@/lib/generation/blogAsyncJob";
import { createServiceSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;

async function dispatchBackgroundRun(runCtx) {
  try {
    const { waitUntil } = await import("@vercel/functions");
    const { executeBlogAsyncJobRun } = await import(
      "@/lib/generation/executeBlogAsyncJobRun"
    );
    const work = executeBlogAsyncJobRun(runCtx).catch((err) => {
      console.error("[blog-async-run] background failed", err?.message || err);
    });
    waitUntil(work);
    return "waitUntil";
  } catch (waitErr) {
    console.warn("[blog-async-run] waitUntil path failed", waitErr?.message || waitErr);
  }

  try {
    const { after } = await import("next/server");
    const { executeBlogAsyncJobRun } = await import(
      "@/lib/generation/executeBlogAsyncJobRun"
    );
    after(() =>
      executeBlogAsyncJobRun(runCtx).catch((err) => {
        console.error("[blog-async-run] after failed", err?.message || err);
      })
    );
    return "after";
  } catch (afterErr) {
    console.warn("[blog-async-run] after path failed", afterErr?.message || afterErr);
  }

  return null;
}

export async function POST(request, { params }) {
  try {
    await hydrateGlobalEngineForGeneration();

    const auth = await requireVerifiedUser(request);
    if (auth.error) {
      return NextResponse.json(
        { ok: false, userMessage: auth.error.message },
        { status: auth.error.status }
      );
    }

    const { jobId } = await params;
    const userId = auth.user.id;
    const opsDb = createServiceSupabase() || auth.supabase;

    const job = await getBlogAsyncJob({ supabase: opsDb, jobId, userId });
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

    const locked = await markBlogAsyncJobRunning({ supabase: opsDb, jobId, userId });
    if (!locked || locked.status !== "running") {
      const current = await getBlogAsyncJob({ supabase: opsDb, jobId, userId });
      return NextResponse.json({
        ok: true,
        mode: "async_job",
        jobId,
        status: current?.status || job.status,
        snapshot: blogAsyncJobSnapshot(current || job),
      });
    }

    const runCtx = {
      supabase: opsDb,
      userId,
      jobId,
      rawInput: locked.rawInput,
      planId: locked.planId,
      route: `/api/content/blog/async/${jobId}/run`,
    };

    const scheduleMode = await dispatchBackgroundRun(runCtx);
    if (!scheduleMode) {
      const { executeBlogAsyncJobRun } = await import(
        "@/lib/generation/executeBlogAsyncJobRun"
      );
      await executeBlogAsyncJobRun(runCtx);
      const done = await getBlogAsyncJob({ supabase: opsDb, jobId, userId });
      if (done?.status === "done" && done.result) {
        return NextResponse.json({
          ok: done.result?.ok !== false,
          mode: "async_job",
          jobId,
          status: "done",
          inline: true,
          snapshot: blogAsyncJobSnapshot(done),
          ...done.result,
        });
      }
    }

    return NextResponse.json(
      {
        ok: true,
        mode: "async_job",
        jobId,
        status: "running",
        accepted: true,
        scheduleMode: scheduleMode || "inline",
        snapshot: blogAsyncJobSnapshot(locked),
      },
      { status: 202 }
    );
  } catch (err) {
    console.error("[blog-async-run]", err);
    return NextResponse.json(
      {
        ok: false,
        userMessage: "글 생성을 시작하지 못했습니다. 다시 시도해 주세요.",
        code: "async_run_start_failed",
        detail: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}
