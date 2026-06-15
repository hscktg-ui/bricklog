import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const defaultRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * .env.local → process.env (Windows CRLF safe, existing env wins)
 * @param {string} [root]
 */
export function loadEnvLocal(root = defaultRoot) {
  try {
    const raw = readFileSync(join(root, ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
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
