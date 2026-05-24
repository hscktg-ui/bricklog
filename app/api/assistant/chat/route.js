import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/api/rateLimit";
import { requireUser } from "@/lib/api/auth";
import { runAssistantReply } from "@/lib/assistant/runAssistantReply";

export const runtime = "nodejs";

const MAX_PER_MIN =
  Number(process.env.BRICLOG_ASSISTANT_RATE_LIMIT_PER_MIN) || 15;

export async function POST(request) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(`assistant:${ip}`, {
    max: MAX_PER_MIN,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      {
        ok: false,
        userMessage: "질문이 많습니다. 잠시 후 다시 시도해 주세요.",
      },
      { status: 429 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, userMessage: "요청 형식이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const message = String(body.message || "").trim();
  if (!message || message.length > 1500) {
    return NextResponse.json(
      {
        ok: false,
        userMessage: "질문을 1~1500자 이내로 입력해 주세요.",
      },
      { status: 400 }
    );
  }

  const history = Array.isArray(body.history) ? body.history : [];
  const auth = await requireUser(request);
  const loggedIn = !auth.error;

  const result = await runAssistantReply(message, {
    loggedIn,
    hasBlog: !!body.hasBlog,
    forceLlm: !!body.forceLlm,
  }, history);

  return NextResponse.json({
    ok: result.ok,
    reply: result.reply,
    source: result.source,
    topic: result.topic,
    escalate: result.escalate,
  });
}
