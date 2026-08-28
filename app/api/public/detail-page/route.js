import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/api/rateLimit";
import {
  assessPublicTestQuota,
  recordPublicTestRun,
} from "@/lib/publicTest/publicTestQuotaServer";
import { generateDetailPagePack } from "@/lib/product/detailPageEngine";
import { sanitizePublicDetailPageBody } from "@/lib/product/detailPagePublic";
import {
  renderDetailPageBodyHtml,
  wrapSmartstoreHtml,
  packToPlainText,
} from "@/lib/product/detailPageHtml";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const sessionId = String(searchParams.get("sessionId") || "").slice(0, 64);
  const quota = await assessPublicTestQuota(request, sessionId);
  return NextResponse.json({
    ok: true,
    remaining: quota.remaining ?? 0,
    used: quota.used ?? 0,
    resetsAt: quota.resetsAt,
    limited: !quota.ok,
  });
}

export async function POST(request) {
  const ip = getClientIp(request);
  const burst = checkRateLimit(`public-detail-page:${ip}`, {
    max: 8,
    windowMs: 60_000,
  });
  if (!burst.ok) {
    return NextResponse.json(
      { ok: false, userMessage: "요청이 많습니다. 잠시 후 다시 만들어 주세요." },
      { status: 429 }
    );
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, userMessage: "입력을 확인해 주세요." },
      { status: 400 }
    );
  }

  const input = sanitizePublicDetailPageBody(body);
  if (!input.productName) {
    return NextResponse.json(
      { ok: false, userMessage: "상품명을 넣어 주세요." },
      { status: 400 }
    );
  }

  const sessionId = String(body.sessionId || "").slice(0, 64);
  const quota = await assessPublicTestQuota(request, sessionId);
  const allowLlm = quota.ok !== false;

  try {
    const result = await generateDetailPagePack(input, { allowLlm });
    const pack = result.pack;
    const html = renderDetailPageBodyHtml(pack, []);
    const gptUsed = result.mode === "llm";

    const nextQuota = gptUsed
      ? await recordPublicTestRun(request, sessionId, {
          brandName: input.brandName || input.productName,
          topic: input.productName,
          channel: "detailPage",
        })
      : {
          remaining: quota.remaining ?? 0,
          used: quota.used ?? 0,
          resetsAt: quota.resetsAt,
        };

    return NextResponse.json({
      ok: true,
      guest: true,
      channel: "detailPage",
      mode: result.mode,
      gptUsed,
      pack,
      html,
      documentHtml: wrapSmartstoreHtml(html),
      plainText: packToPlainText(pack),
      standard: pack._meta?.standard || null,
      meta: pack._meta,
      quota: nextQuota,
      userMessage: gptUsed
        ? ""
        : "오늘 GPT 횟수는 여기서 초안으로 나갑니다. 입력하신 사실로 상세페이지는 받을 수 있습니다.",
    });
  } catch (err) {
    console.error("[api/public/detail-page]", err);
    return NextResponse.json(
      { ok: false, userMessage: "상세페이지를 만들지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
