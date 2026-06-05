import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";
import {
  applyPhoneVerificationToProfile,
  fetchProfile,
  isMissingProfilesTable,
  withTrustedProfileRole,
} from "@/lib/auth/profileServer";
import { isMissingPhoneOtpTable } from "@/lib/auth/phoneOtpServer";

export const runtime = "nodejs";

export async function POST(request) {
  const auth = await requireUser(request);
  if (auth.error) {
    return NextResponse.json(
      { ok: false, userMessage: auth.error.message },
      { status: auth.error.status }
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

  try {
    await applyPhoneVerificationToProfile(
      auth.user.id,
      body?.phoneVerificationId ?? "",
      body?.phone ?? ""
    );
    const profile = await fetchProfile(auth.supabase, auth.user.id);
    return NextResponse.json({
      ok: true,
      profile: withTrustedProfileRole(profile, auth.user.email),
      userMessage: "휴대폰 인증이 계정에 연결되었습니다.",
    });
  } catch (err) {
    if (err.code === "PHONE_NOT_VERIFIED" || err.code === "PHONE_TAKEN") {
      return NextResponse.json(
        { ok: false, userMessage: err.message },
        { status: 400 }
      );
    }
    if (isMissingPhoneOtpTable(err) || isMissingProfilesTable(err)) {
      return NextResponse.json({
        ok: false,
        userMessage:
          "문자 인증 DB가 준비되지 않았습니다. schema-v14-phone-sms.sql을 실행해 주세요.",
      });
    }
    console.error("[api/auth/profile/phone]", err);
    return NextResponse.json(
      { ok: false, userMessage: "휴대폰 인증 연결에 실패했습니다." },
      { status: 500 }
    );
  }
}
