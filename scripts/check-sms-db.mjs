import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envText = readFileSync(resolve(root, ".env.local"), "utf8");
const get = (k) => {
  const line = envText.split(/\r?\n/).find((l) => l.startsWith(`${k}=`));
  if (!line) return "";
  let v = line.slice(k.length + 1).trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  return v;
};

const url = get("NEXT_PUBLIC_SUPABASE_URL");
const key = get("SUPABASE_SERVICE_ROLE_KEY");
if (!url || !key) {
  console.log("missing supabase env");
  process.exit(1);
}

const sb = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: rows, error: tableErr } = await sb
  .from("phone_otp_verifications")
  .select("id")
  .limit(1);

if (tableErr) {
  console.log("phone_otp_verifications:", tableErr.code, tableErr.message);
} else {
  console.log("phone_otp_verifications: OK", `(rows: ${rows?.length ?? 0})`);
}

const { error: insertErr } = await sb.from("phone_otp_verifications").insert({
  phone_normalized: "+821099998888",
  code_hash: "test",
  expires_at: new Date(Date.now() + 300000).toISOString(),
});

if (insertErr) {
  console.log("insert:", insertErr.code, insertErr.message);
} else {
  console.log("insert: OK");
  await sb
    .from("phone_otp_verifications")
    .delete()
    .eq("phone_normalized", "+821099998888");
}
