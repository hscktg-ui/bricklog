import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";
import {
  isMissingProfilesTable,
  recordTermsConsent,
} from "@/lib/auth/profileServer";

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
    const body = await request.json().catch(() => ({}));
    if (!body.termsAgreed || !body.privacyAgreed) {
      return NextResponse.json(
        {
          ok: false,
          userMessage: "이용약관과 개인정보처리방침에 동의해 주세요.",
        },
        { status: 400 }
      );
    }

    const profile = await recordTermsConsent(auth.supabase, auth.user.id, {
      marketing: Boolean(body.marketingAgreed),
    });

    return NextResponse.json({ ok: true, profile });
  } catch (err) {
    if (isMissingProfilesTable(err)) {
      return NextResponse.json({
        ok: false,
        userMessage:
          "약관 동의를 저장할 수 없습니다. Supabase에서 schema-v7-auth-profiles.sql을 실행해 주세요.",
        profilesReady: false,
      });
    }
    return NextResponse.json(
      { ok: false, userMessage: "약관 동의를 저장하지 못했습니다." },
      { status: 500 }
    );
  }
}
