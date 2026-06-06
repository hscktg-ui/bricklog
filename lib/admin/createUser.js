/**
 * 운영자 — Supabase auth 계정 + profiles 생성
 */
export async function adminCreateUser(service, { email, password, nickname = "" }) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const pwd = String(password || "").trim();

  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { ok: false, userMessage: "올바른 이메일을 입력해 주세요." };
  }
  if (pwd.length < 8) {
    return { ok: false, userMessage: "비밀번호는 8자 이상이어야 합니다." };
  }

  const { data, error } = await service.auth.admin.createUser({
    email: normalizedEmail,
    password: pwd,
    email_confirm: true,
  });

  if (error) {
    const msg = String(error.message || "");
    if (/already|registered|exists/i.test(msg)) {
      return { ok: false, userMessage: "이미 가입된 이메일입니다." };
    }
    return { ok: false, userMessage: msg || "계정 생성에 실패했습니다." };
  }

  const userId = data?.user?.id;
  if (!userId) {
    return { ok: false, userMessage: "계정 ID를 받지 못했습니다." };
  }

  const now = new Date().toISOString();
  const { error: profileErr } = await service.from("profiles").upsert(
    {
      id: userId,
      email: normalizedEmail,
      nickname: nickname?.trim() || null,
      display_name: nickname?.trim() || normalizedEmail.split("@")[0],
      terms_agreed_at: now,
      privacy_agreed_at: now,
      profile_completed_at: now,
      last_login_at: null,
      last_seen_at: null,
    },
    { onConflict: "id" }
  );

  if (profileErr) {
    return {
      ok: false,
      userMessage: `프로필 생성 실패: ${profileErr.message}`,
      userId,
    };
  }

  return {
    ok: true,
    user: {
      id: userId,
      email: normalizedEmail,
      nickname: nickname?.trim() || null,
      createdAt: data.user.created_at,
    },
  };
}
