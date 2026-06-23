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

export const runtime = "nodejs";
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
  const job = getBlogAsyncJob(jobId, auth.user.id);
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

  if (job.running) {
    return NextResponse.json({
      ok: true,
      mode: "async_job",
      jobId,
      status: "running",
      snapshot: blogAsyncJobSnapshot(job),
    });
  }

  const locked = markBlogAsyncJobRunning(jobId, auth.user.id);
  if (!locked) {
    return NextResponse.json({
      ok: true,
      mode: "async_job",
      jobId,
      status: job.status,
      snapshot: blogAsyncJobSnapshot(job),
    });
  }

  try {
    const { body } = await runBlogApiGeneration(auth, locked.rawInput, {
      route: `/api/content/blog/async/${jobId}/run`,
      planId: locked.planId,
    });
    completeBlogAsyncJob(jobId, auth.user.id, body);
    return NextResponse.json({
      ok: body?.ok !== false,
      mode: "async_job",
      jobId,
      snapshot: blogAsyncJobSnapshot(getBlogAsyncJob(jobId, auth.user.id)),
      ...body,
    });
  } catch (err) {
    failBlogAsyncJob(jobId, auth.user.id, err?.message || "server_error");
    return NextResponse.json(
      {
        ok: false,
        mode: "async_job",
        jobId,
        userMessage: "글 생성 중 오류가 났어요. 다시 시도해 주세요.",
      },
      { status: 500 }
    );
  }
}
