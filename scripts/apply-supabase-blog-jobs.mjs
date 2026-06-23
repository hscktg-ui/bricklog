/**
 * blog_generation_jobs 테이블 적용 (service role)
 * Run: npm run db:apply-blog-jobs
 */
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./lib/loadEnvLocal.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sqlPath = join(root, "supabase", "schema-v22-blog-generation-jobs.sql");

function loadEnv() {
  loadEnvLocal(root);
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log("SKIP: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing");
    process.exit(0);
  }
  if (!existsSync(sqlPath)) {
    console.error("MISSING:", sqlPath);
    process.exit(1);
  }

  const sql = readFileSync(sqlPath, "utf8");
  const db = createClient(url, key, { auth: { persistSession: false } });

  const { error } = await db.rpc("exec_sql", { query: sql }).maybeSingle?.() ?? {
    error: { message: "no exec_sql rpc" },
  };

  if (error?.message?.includes("exec_sql") || error?.message?.includes("schema cache")) {
    const { error: probeErr } = await db
      .from("blog_generation_jobs")
      .select("id")
      .limit(1);
    if (!probeErr) {
      console.log("OK: blog_generation_jobs already exists");
      process.exit(0);
    }
    console.log(`
MANUAL: Supabase SQL Editor에서 실행하세요:
  ${sqlPath}
`);
    process.exit(1);
  }

  if (error) {
    console.error("apply failed:", error.message);
    process.exit(1);
  }
  console.log("OK: blog_generation_jobs applied");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
