import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";
import {
  fetchProfile,
  isMissingProfileColumn,
  isMissingProfilesTable,
  profileSaveUserMessage,
  upsertProfileOnLogin,
  updateSignupProfile,
  withTrustedProfileRole,
} from "@/lib/auth/profileServer";

export const runtime = "nodejs";

export async function GET(request) {
  const auth = await requireUser(request);
  if (auth.error) {
    return NextResponse.json(
      { ok: false, userMessage: auth.error.message },
      { status: auth.error.status }
    );
  }

  try {
    let profile = await fetchProfile(auth.supabase, auth.user.id);
    if (!profile) {
      profile = await upsertProfileOnLogin(auth.supabase, auth.user);
    }
    return NextResponse.json({
      ok: true,
      profile: withTrustedProfileRole(profile, auth.user.email),
    });
  } catch (err) {
    if (isMissingProfilesTable(err)) {
      return NextResponse.json({
        ok: false,
        userMessage:
          "프로필 기능을 준비 중입니다. Supabase에서 schema-v7-auth-profiles.sql을 실행해 주세요.",
        profilesReady: false,
      });
    }
    return NextResponse.json(
      { ok: false, userMessage: "프로필을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const auth = await requireUser(request);
  if (auth.error) {
    return NextResponse.json(
      { ok: false, userMessage: auth.error.message },
      { status: auth.error.status }
    );
  }

  try {
    const profile = await upsertProfileOnLogin(auth.supabase, auth.user);
    return NextResponse.json({
      ok: true,
      profile: withTrustedProfileRole(profile, auth.user.email),
    });
  } catch (err) {
    if (isMissingProfilesTable(err)) {
      return NextResponse.json({
        ok: false,
        userMessage:
          "프로필 기능을 준비 중입니다. Supabase에서 schema-v7-auth-profiles.sql을 실행해 주세요.",
        profilesReady: false,
      });
    }
    return NextResponse.json(
      { ok: false, userMessage: "프로필을 갱신하지 못했습니다." },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
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
    const profile = await updateSignupProfile(
      auth.supabase,
      auth.user.id,
      body
    );
    return NextResponse.json({
      ok: true,
      profile: withTrustedProfileRole(profile, auth.user.email),
    });
  } catch (err) {
    if (err.code === "VALIDATION" || err.code === "NICKNAME_TAKEN") {
      return NextResponse.json(
        { ok: false, userMessage: err.message },
        { status: 400 }
      );
    }
    if (isMissingProfilesTable(err) || isMissingProfileColumn(err)) {
      return NextResponse.json({
        ok: false,
        userMessage: profileSaveUserMessage(err),
        profilesReady: false,
      });
    }
    return NextResponse.json(
      { ok: false, userMessage: profileSaveUserMessage(err) },
      { status: 500 }
    );
  }
}
