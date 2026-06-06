import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal() {
  const env = {};
  for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const env = loadEnvLocal();
const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];

const content = `<div style="font-family:sans-serif;line-height:1.6;color:#191F28">
<h2 style="margin:0 0 12px">BRICLOG 비밀번호 재설정</h2>
<p>아래 버튼을 눌러 새 비밀번호를 설정해 주세요. 링크는 <strong>1시간</strong> 동안, <strong>한 번만</strong> 사용할 수 있습니다.</p>
<p style="margin:24px 0"><a href="https://briclog.ai/auth/reset-password?token_hash={{ .TokenHash }}&amp;type=recovery" style="display:inline-block;background:#03C75A;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700">비밀번호 재설정하기</a></p>
<p style="font-size:13px;color:#8B95A1">버튼이 안 보이면 아래 주소를 복사해 브라우저에 붙여넣으세요.<br/>https://briclog.ai/auth/reset-password?token_hash={{ .TokenHash }}&amp;type=recovery</p>
<p style="font-size:13px;color:#8B95A1">인증 코드: {{ .Token }}</p>
</div>`;

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    mailer_subjects_recovery: "BRICLOG 비밀번호 재설정",
    mailer_templates_recovery_content: content,
  }),
});

const body = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error("FAIL", res.status, body);
  process.exit(1);
}
console.log("OK recovery template:", body.mailer_subjects_recovery);
