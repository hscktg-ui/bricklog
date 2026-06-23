import { NextResponse } from "next/server";
import { requireVerifiedUser } from "@/lib/api/auth";
import {
  getBlogAsyncJob,
  blogAsyncJobSnapshot,
} from "@/lib/generation/blogAsyncJob";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request, { params }) {
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
      { ok: false, userMessage: "생성 작업을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  if (job.status === "done" && job.result) {
    return NextResponse.json({
      ok: job.result?.ok !== false,
      mode: "async_job",
      jobId,
      status: "done",
      snapshot: blogAsyncJobSnapshot(job),
      ...job.result,
    });
  }

  if (job.status === "failed") {
    return NextResponse.json({
      ok: false,
      mode: "async_job",
      jobId,
      status: "failed",
      userMessage:
        job.error || job.result?.userMessage || "생성에 실패했습니다.",
      snapshot: blogAsyncJobSnapshot(job),
      result: job.result || null,
    });
  }

  return NextResponse.json({
    ok: true,
    mode: "async_job",
    jobId,
    status: job.status,
    snapshot: blogAsyncJobSnapshot(job),
  });
}
