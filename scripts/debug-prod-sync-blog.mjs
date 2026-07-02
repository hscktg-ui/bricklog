import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { applyE2eTestCredentialsToEnv } from "../lib/qa/e2eTestCredentials.js";
import { getE2eBearerToken } from "./lib/e2eAuth.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "https://briclog.ai";
try {
  for (const raw of readFileSync(join(root, ".env.local"), "utf8").split(/\r?\n/)) {
    const line = raw.replace(/\r$/, "").trim();
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch {}
applyE2eTestCredentialsToEnv(process.env);

const auth = await getE2eBearerToken();
const payload = {
  brandName: "산책카페",
  region: "전주 한옥마을",
  topic: "봄 시즌 브런치",
  industry: "카페",
  blogLengthTier: "short",
  researchEnabled: false,
  skipAutoPipeline: true,
};
const res = await fetch(`${BASE}/api/content/blog`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${auth.token}`,
  },
  body: JSON.stringify(payload),
});
const text = await res.text();
console.log("sync blog", res.status, text.slice(0, 500));
