import { NextResponse } from "next/server";
import { resolveNicknameAvailability } from "@/lib/auth/checkNicknameServer";
import { validateNickname } from "@/lib/auth/signupProfile";
import { getBearerToken } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request) {
  const nickname = request.nextUrl.searchParams.get("nickname") ?? "";
  const excludeUserId =
    request.nextUrl.searchParams.get("excludeUserId")?.trim() || null;

  const check = validateNickname(nickname);
  if (!check.ok) {
    return NextResponse.json({
      ok: true,
      available: false,
      valid: false,
      userMessage: check.message,
    });
  }

  try {
    const result = await resolveNicknameAvailability(
      check.value,
      excludeUserId
    );

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, userMessage: result.message },
        { status: result.reason === "config" ? 503 : 500 }
      );
    }

    if (result.deferred) {
      return NextResponse.json({
        ok: true,
        available: true,
        valid: true,
        deferred: true,
        userMessage:
          "지금은 바로 확인하기 어렵습니다. 가입·저장할 때 닉네임 중복을 다시 확인해요.",
      });
    }

    return NextResponse.json({
      ok: true,
      available: result.available,
      valid: result.valid,
      nickname: check.value,
      userMessage: result.available
        ? "사용 가능한 닉네임입니다."
        : "이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해 주세요.",
    });
  } catch {
    return NextResponse.json(
      { ok: false, userMessage: "닉네임을 확인하지 못했습니다." },
      { status: 500 }
    );
  }
}
