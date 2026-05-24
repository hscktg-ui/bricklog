import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";
import {
  getUserWritingProfile,
  patchUserWritingTraits,
  recomputeUserWritingProfile,
  formatUserWritingBrief,
} from "@/lib/memory/userWritingProfile";

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
    const profile = await getUserWritingProfile(auth.supabase, auth.user.id);
    return NextResponse.json({
      ok: true,
      profile,
      brief: formatUserWritingBrief(profile),
      personalizationReady: !!profile,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, userMessage: "계정 글쓰기 프로필을 불러오지 못했습니다." },
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

  try {
    const body = await request.json();
    const profile = await patchUserWritingTraits(auth.supabase, auth.user.id, {
      userOverrides: {
        defaultSpeechStyle: body.defaultSpeechStyle,
        defaultEmojiDensity: body.defaultEmojiDensity,
        writingNote: body.writingNote,
        preferredContentLength: body.preferredContentLength,
        dislikedPhrases: Array.isArray(body.dislikedPhrases)
          ? body.dislikedPhrases
          : undefined,
        frequentPhrases: Array.isArray(body.frequentPhrases)
          ? body.frequentPhrases
          : undefined,
      },
    });
    return NextResponse.json({
      ok: true,
      profile,
      brief: formatUserWritingBrief(profile),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, userMessage: "설정 저장에 실패했습니다." },
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
    const profile = await recomputeUserWritingProfile(
      auth.supabase,
      auth.user.id
    );
    return NextResponse.json({
      ok: true,
      profile,
      brief: formatUserWritingBrief(profile),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, userMessage: "프로필 집계에 실패했습니다." },
      { status: 500 }
    );
  }
}
