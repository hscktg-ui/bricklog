/**
 * Supabase Auth — 가입 이메일 확인 끄기 + 자동 확인 (문자 가입 SSOT)
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=... npm run patch:supabase-auth-signup
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal() {
  const env = {};
  try {
    for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) env[m[1]] = m[2].trim();
    }
  } catch {
    /* optional */
  }
  return env;
}

const env = { ...loadEnvLocal(), ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const token = env.SUPABASE_ACCESS_TOKEN;

if (!url || !token) {
  console.error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ACCESS_TOKEN in .env.local");
  process.exit(1);
}

const ref = new URL(url).hostname.split(".")[0];

const confirmationContent = `<div style="font-family:sans-serif;line-height:1.6;color:#191F28">
<h2 style="margin:0 0 12px">BRICLOG</h2>
<p>브릭로그는 <strong>휴대폰 문자 인증</strong>으로 가입합니다. 이 메일은 사용하지 않아도 됩니다.</p>
<p style="font-size:13px;color:#8B95A1">문의: https://briclog.ai/help</p>
</div>`;

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    mailer_autoconfirm: true,
    mailer_subjects_confirmation: "BRICLOG 가입 안내 (문자 인증 이용)",
    mailer_templates_confirmation_content: confirmationContent,
    site_url: env.NEXT_PUBLIC_APP_URL || "https://briclog.ai",
  }),
});

const body = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error("FAIL", res.status, body);
  process.exit(1);
}

console.log("OK supabase auth signup:", {
  mailer_autoconfirm: body.mailer_autoconfirm,
  site_url: body.site_url,
  mailer_subjects_confirmation: body.mailer_subjects_confirmation,
});
