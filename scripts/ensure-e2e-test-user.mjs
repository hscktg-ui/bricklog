/**
 * E2E용 테스트 계정 확보 (Supabase service role)
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const DEFAULT_EMAIL = "hundred-ux-smoke@briclog.ai";
const DEFAULT_PASSWORD = "BriclogUxSmoke9!";

function loadEnvLocal() {
  try {
    const raw = readFileSync(join(root, ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      let val = m[2].trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[m[1]]) process.env[m[1]] = val;
    }
  } catch {
    /* optional */
  }
}

async function ensureE2eProfile(admin, userId, email) {
  const now = new Date().toISOString();
  const { error } = await admin.from("profiles").upsert(
    {
      id: userId,
      email,
      terms_agreed_at: now,
      privacy_agreed_at: now,
      nickname: "ux스모크",
      profile_completed_at: now,
    },
    { onConflict: "id" }
  );
  if (error) return { ok: false, reason: `profile_upsert:${error.message}` };
  return { ok: true };
}

/**
 * @returns {Promise<{ ok: boolean, email?: string, password?: string, reason?: string }>}
 */
export async function ensureE2eTestUser(options = {}) {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = options.email || process.env.BRICLOG_TEST_EMAIL || DEFAULT_EMAIL;
  const password =
    options.password || process.env.BRICLOG_TEST_PASSWORD || DEFAULT_PASSWORD;

  if (!url || !key) {
    return { ok: false, reason: "missing_supabase_service_role" };
  }

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: listed, error: listErr } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listErr) {
    return { ok: false, reason: `list_users:${listErr.message}` };
  }

  const existing = listed?.users?.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  if (existing) {
    const { error: updErr } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    if (updErr) {
      return { ok: false, reason: `update_user:${updErr.message}` };
    }
    const prof = await ensureE2eProfile(admin, existing.id, email);
    if (!prof.ok) return prof;
    return { ok: true, email, password, reused: true };
  }

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr) {
    return { ok: false, reason: `create_user:${createErr.message}` };
  }

  const prof = await ensureE2eProfile(admin, created.user.id, email);
  if (!prof.ok) return prof;
  return { ok: true, email, password, reused: false };
}

/**
 * Playwright storageState — UI 로그인 대신 Supabase 세션 주입
 * @param {string} baseUrl
 */
export async function buildSupabasePlaywrightStorage(baseUrl) {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const email = process.env.BRICLOG_TEST_EMAIL || DEFAULT_EMAIL;
  const password = process.env.BRICLOG_TEST_PASSWORD || DEFAULT_PASSWORD;

  if (!url || !anon) {
    return { ok: false, reason: "missing_supabase_anon" };
  }

  const ensured = await ensureE2eTestUser({ email, password });
  if (!ensured.ok) return ensured;

  const client = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data?.session) {
    return { ok: false, reason: `sign_in:${error?.message || "no_session"}` };
  }

  const ref = new URL(url).hostname.split(".")[0];
  const storageKey = `sb-${ref}-auth-token`;
  const sessionPayload = {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    expires_in: data.session.expires_in,
    token_type: data.session.token_type,
    user: data.session.user,
  };

  const origin = baseUrl.replace(/\/$/, "");
  const tokenValue = JSON.stringify(sessionPayload);

  return {
    ok: true,
    email,
    storageKey,
    tokenValue,
    storageState: {
      cookies: [],
      origins: [
        {
          origin,
          localStorage: [{ name: storageKey, value: tokenValue }],
          sessionStorage: [{ name: storageKey, value: tokenValue }],
        },
      ],
    },
  };
}

/**
 * Playwright storageState만으로는 sessionStorage가 복원되지 않는 경우가 있어
 * 페이지 스크립트보다 먼저 세션을 넣습니다 (@see lib/supabaseClient.js).
 * @param {import('playwright').BrowserContext} context
 * @param {{ storageKey: string, tokenValue: string }} session
 */
export async function applySupabaseSessionToContext(context, session) {
  if (!session?.storageKey || !session?.tokenValue) return;
  await context.addInitScript(
    ({ key, value }) => {
      try {
        localStorage.setItem(key, value);
        sessionStorage.setItem(key, value);
      } catch {
        /* ignore */
      }
    },
    { key: session.storageKey, value: session.tokenValue }
  );
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  ensureE2eTestUser().then((res) => {
    if (!res.ok) {
      console.error("FAIL:", res.reason);
      process.exit(1);
    }
    console.log("OK:", res.email, res.reused ? "(reused)" : "(created)");
  });
}
