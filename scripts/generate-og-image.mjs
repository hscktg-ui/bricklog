/**
 * public/og.png 갱신 — 로컬 dev 서버 또는 배포 URL의 opengraph-image에서 받기
 *   npm run dev  후: npm run generate:og-image
 *   또는: curl -o public/og.png https://bricklog.vercel.app/opengraph-image
 */
import { writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "public/og.png");
const source =
  process.env.OG_IMAGE_SOURCE ||
  "https://briclog.ai/opengraph-image";

const res = await fetch(source);
if (!res.ok) {
  console.error("Failed to fetch OG image:", res.status, source);
  process.exit(1);
}
writeFileSync(out, Buffer.from(await res.arrayBuffer()));
console.log("Wrote", out, `(${(await import("node:fs")).statSync(out).size} bytes)`);
