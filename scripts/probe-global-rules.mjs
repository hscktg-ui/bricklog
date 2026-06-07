import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal() {
  const path = resolve(root, ".env.local");
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = { ...loadEnvLocal(), ...process.env };
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data, error } = await db.from("global_engine_rules").select("rule_key, rules, version");
if (error) {
  console.error(error.message);
  process.exit(1);
}
for (const row of data || []) {
  console.log(row.rule_key, "v" + row.version);
  const r = row.rules || {};
  if (r.forbiddenPhrases?.length) {
    console.log("  forbiddenPhrases:", r.forbiddenPhrases.slice(0, 5));
  }
  if (r.voiceEndings) console.log("  voiceEndings:", r.voiceEndings);
  if (r.arcMarkers) console.log("  arcMarkers keys:", Object.keys(r.arcMarkers));
}
