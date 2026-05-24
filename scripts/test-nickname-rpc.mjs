import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const env = readFileSync(".env.local", "utf8");
const get = (k) => {
  const m = env.match(new RegExp(`^${k}=(.+)$`, "m"));
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : "";
};

const url = get("NEXT_PUBLIC_SUPABASE_URL");
const anon = get("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const service = get("SUPABASE_SERVICE_ROLE_KEY");

async function tryRpc(label, key) {
  const c = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await c.rpc("check_nickname_available", {
    p_nickname: "briclog_rpc_test",
    p_exclude_user_id: null,
  });
  console.log(label, { error: error?.code, message: error?.message, data });
}

console.log("url set:", Boolean(url), "anon set:", Boolean(anon), "service set:", Boolean(service));
await tryRpc("anon", anon);
if (service) await tryRpc("service", service);
