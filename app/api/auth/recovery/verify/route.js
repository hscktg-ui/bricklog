import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * 비밀번호 재설정 메일의 token_hash 검증 (PKCE·메일 프리페치 우회)
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, userMessage: "요청 형식이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const tokenHash = String(body?.token_hash || "").trim();
  if (!tokenHash) {
    return NextResponse.json(
      { ok: false, userMessage: "재설정 토큰이 없습니다." },
      { status: 400 }
    );
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "recovery",
  });

  if (error || !data?.session) {
    return NextResponse.json(
      {
        ok: false,
        userMessage:
          "재설정 링크가 만료되었거나 이미 사용되었습니다. 비밀번호 찾기를 다시 요청해 주세요.",
      },
      { status: 400 }
    );
  }

  const session = data.session;
  return NextResponse.json({
    ok: true,
    session: {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      expires_in: session.expires_in,
      token_type: session.token_type,
      user: session.user,
    },
  });
}
