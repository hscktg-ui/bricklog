import fs from "fs";
import path from "path";
import { parseLegalMarkdown } from "./parseLegalMarkdown";

const LEGAL_DIR = path.join(process.cwd(), "content", "legal");

/**
 * @param {"terms"|"privacy"|"refund"} slug
 */
export function loadLegalDocument(slug) {
  const filePath = path.join(LEGAL_DIR, `${slug}.md`);
  const raw = fs.readFileSync(filePath, "utf8");
  const meta = extractMeta(raw);
  const body = stripMetaBlock(raw);
  return {
    meta,
    content: parseLegalMarkdown(body),
  };
}

function extractMeta(raw) {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(raw);
  if (!match) return {};
  const meta = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return meta;
}

function stripMetaBlock(raw) {
  return raw.replace(/^---\n[\s\S]*?\n---\n/, "");
}
