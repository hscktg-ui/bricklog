import { NextResponse } from "next/server";
import { callOpenAIAssistant } from "@/lib/llm/assistantChat";
import { isOpenAIConfigured } from "@/lib/llm/llmProvider";

export const runtime = "nodejs";
export const maxDuration = 30;

function getInternalSecret() {
  return (
    process.env.BRICLOG_INTERNAL_SECRET ||
    process.env.BRICLOG_CRON_SECRET ||
    process.env.CRON_SECRET
  );
}

const SYSTEM = `당신은 해신기획(HAESHIN) 마케팅 부서대행사의 문의 분석 도우미입니다.
문의 폼 내용을 읽고 담당자가 30초 안에 판단할 수 있도록 한국어로 짧게 정리합니다.

규칙:
- 마크다운·번호·불릿 금지
- 각 줄은 "라벨: 내용" 형식 (5줄 고정)
- 추측은 하되 과장하지 말 것
- 없는 정보는 "미기재"로 표시

출력 형식:
의뢰 성격: ...
관심 서비스: ...
긴급도: ...
연락 우선: ...
다음 액션: ...`;

function buildInquiryText(body) {
  return [
    `브랜드: ${String(body.brand || "").trim()}`,
    `성함: ${String(body.name || "").trim()}`,
    `직급: ${String(body.title || "").trim()}`,
    `연락처: ${String(body.phone || "").trim()}`,
    `이메일: ${String(body.email || "").trim()}`,
    "",
    "문의 내용:",
    String(body.message || "").trim(),
  ].join("\n");
}

export async function POST(request) {
  const secret = getInternalSecret()?.trim();
  if (!secret) {
    return NextResponse.json({ ok: false, error: "secret_not_configured" }, { status: 503 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!isOpenAIConfigured()) {
    return NextResponse.json({ ok: false, error: "llm_not_configured" }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const inquiry = buildInquiryText(body);
  if (inquiry.replace(/\s/g, "").length < 20) {
    return NextResponse.json({ ok: false, error: "inquiry_too_short" }, { status: 400 });
  }

  try {
    const brief = await callOpenAIAssistant(
      [
        { role: "system", content: SYSTEM },
        { role: "user", content: inquiry },
      ],
      { maxTokens: 420, temperature: 0.25 },
    );

    return NextResponse.json({ ok: true, brief: String(brief).trim() });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e.message || "brief_failed" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "POST inquiry JSON with Authorization: Bearer BRICLOG_INTERNAL_SECRET",
  });
}
