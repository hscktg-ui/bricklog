import { NextResponse } from "next/server";
import { requireVerifiedUser } from "@/lib/api/auth";
import { checkRateLimit, getClientIp } from "@/lib/api/rateLimit";
import { createPromptContext } from "@/utils/promptBuilder";
import { normalizePipelineInput } from "@/lib/contentPipeline";
import { runContentQualityReviewPipeline } from "@/lib/quality/runContentQualityReviewPipeline";
import { logError } from "@/lib/api/logEvent";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_PER_MIN =
  Number(process.env.BRICLOG_QUALITY_REVIEW_RATE_LIMIT_PER_MIN) || 12;

export async function POST(request) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(`quality-review:${ip}`, {
    max: MAX_PER_MIN,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, userMessage: "요청이 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429 }
    );
  }

  const auth = await requireVerifiedUser(request);
  if (auth.error) {
    return NextResponse.json(
      { ok: false, userMessage: auth.error.message },
      { status: auth.error.status }
    );
  }

  try {
    const body = await request.json();
    const pack = body.blog;
    if (!pack?.sections?.length) {
      return NextResponse.json({
        ok: false,
        userMessage: "검수할 블로그 본문이 없습니다.",
      });
    }

    const input = normalizePipelineInput(body.input || {});
    const ctx = createPromptContext(input);
    const { pack: reviewed, review, revisionCount } =
      await runContentQualityReviewPipeline(pack, ctx, {
        input,
        placeContent: body.placeContent,
        instagramContent: body.instagramContent,
      });

    return NextResponse.json({
      ok: true,
      blog: reviewed,
      review,
      revisionCount,
    });
  } catch (err) {
    logError("quality-review", err);
    return NextResponse.json(
      {
        ok: false,
        userMessage: "품질 검수에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      },
      { status: 500 }
    );
  }
}
