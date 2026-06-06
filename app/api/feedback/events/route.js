import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";
import {
  insertContentEvent,
  isMissingFeedbackTable,
} from "@/lib/feedback/server/events";
import { runSelfEvolutionOnContentEvent } from "@/lib/evolution/selfEvolutionCore";

export const runtime = "nodejs";

export async function POST(request) {
  const auth = await requireUser(request);
  if (auth.error) {
    return NextResponse.json(
      { ok: false, userMessage: auth.error.message },
      { status: auth.error.status }
    );
  }

  try {
    const body = await request.json();
    const row = await insertContentEvent(auth.supabase, auth.user.id, body);

    let evolution = null;
    try {
      evolution = await runSelfEvolutionOnContentEvent(row, {
        beforePlain: body.meta?.beforePlain,
        afterPlain: body.meta?.afterPlain,
        input: body.meta?.input,
      });
    } catch {
      /* 진화 루프 실패해도 이벤트 저장 유지 */
    }

    return NextResponse.json({ ok: true, event: row, evolution });
  } catch (err) {
    if (isMissingFeedbackTable(err)) {
      return NextResponse.json({ ok: true, skipped: true, memoryReady: false });
    }
    if (err.message === "invalid_event_type") {
      return NextResponse.json(
        { ok: false, userMessage: "알 수 없는 이벤트입니다." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { ok: false, userMessage: "이벤트 저장에 실패했습니다." },
      { status: 500 }
    );
  }
}
