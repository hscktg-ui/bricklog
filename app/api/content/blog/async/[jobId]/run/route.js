import { NextResponse } from "next/server";
import { requireVerifiedUser } from "@/lib/api/auth";
import { hydrateGlobalEngineForGeneration } from "@/lib/feedback/feedbackEngineLoop";
import { runBlogApiGeneration } from "@/lib/generation/blogApiHandler";
import {
  getBlogAsyncJob,
  markBlogAsyncJobRunning,
  completeBlogAsyncJob,
  failBlogAsyncJob,
  blogAsyncJobSnapshot,
} from "@/lib/generation/blogAsyncJob";
import { createServiceSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
/** sync /api/content/blog 와 동일 — columnist+재시도 130s+ 여유 */
export const maxDuration = 300;

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

    const job = await getBlogAsyncJob({
      supabase: opsDb,
      jobId,
      userId,
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
      supabase: opsDb,
      jobId,
      userId,
    });
    if (!locked || locked.status !== "running") {
      const current = await getBlogAsyncJob({
        supabase: opsDb,
        jobId,
        userId,
      });
      return NextResponse.json({
        ok: true,
        mode: "async_job",
        jobId,
        status: current?.status || job.status,
        snapshot: blogAsyncJobSnapshot(current || job),
      });
    }

    const genAuth = {
      supabase: opsDb,
      user: auth.user,
    };

    const { body } = await runBlogApiGeneration(genAuth, locked.rawInput, {
      route: `/api/content/blog/async/${jobId}/run`,
      planId: locked.planId,
    });
    const done = await completeBlogAsyncJob({
      supabase: opsDb,
      jobId,
      userId,
      resultBody: body,
    });
    return NextResponse.json({
      ok: body?.ok !== false,
      mode: "async_job",
      jobId,
      status: "done",
      snapshot: blogAsyncJobSnapshot(done),
      ...body,
    });
  } catch (err) {
    console.error("[blog-async-run]", err);
    try {
      const { jobId } = await params;
      const auth = await requireVerifiedUser(request);
      if (auth.user?.id && jobId) {
        const opsDb = createServiceSupabase() || auth.supabase;
        await failBlogAsyncJob({
          supabase: opsDb,
          jobId,
          userId: auth.user.id,
          message: err?.message || "server_error",
        });
      }
    } catch {
      /* ignore secondary fail */
    }
    return NextResponse.json(
      {
        ok: false,
        mode: "async_job",
        userMessage: "글 생성 중 오류가 났어요. 다시 시도해 주세요.",
        code: "async_run_failed",
        detail: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}
