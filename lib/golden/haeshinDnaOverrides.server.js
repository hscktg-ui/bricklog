/**
 * 해신기획 DNA 운영 오버라이드 — config 파일 (배포 없이 금칙어 추가)
 */
import fs from "fs";
import path from "path";
import {
  AI_CLICHE_PHRASES,
  FORBIDDEN_GLOBAL_PHRASES,
} from "@/lib/golden/haeshinContentDnaSeed";

const CONFIG_PATH = path.join(process.cwd(), "config", "haeshin-dna-overrides.json");

const DEFAULT_OVERRIDES = {
  version: 1,
  forbiddenGlobal: [],
  aiCliche: [],
  updatedAt: null,
};

function readOverridesFile() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
      return {
        ...DEFAULT_OVERRIDES,
        ...raw,
        forbiddenGlobal: Array.isArray(raw?.forbiddenGlobal) ? raw.forbiddenGlobal : [],
        aiCliche: Array.isArray(raw?.aiCliche) ? raw.aiCliche : [],
      };
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_OVERRIDES };
}

function writeOverridesFile(data) {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  const next = {
    ...DEFAULT_OVERRIDES,
    ...data,
    forbiddenGlobal: [...new Set((data.forbiddenGlobal || []).map((s) => String(s).trim()).filter(Boolean))],
    aiCliche: [...new Set((data.aiCliche || []).map((s) => String(s).trim()).filter(Boolean))],
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2), "utf8");
  return next;
}

export function getHaeshinDnaOverrides() {
  return readOverridesFile();
}

export function getEffectiveForbiddenGlobal() {
  const o = readOverridesFile();
  return [...new Set([...FORBIDDEN_GLOBAL_PHRASES, ...o.forbiddenGlobal])];
}

export function getEffectiveAiCliche() {
  const o = readOverridesFile();
  return [...new Set([...AI_CLICHE_PHRASES, ...o.aiCliche])];
}

/**
 * @param {{ addForbidden?: string[], addAiCliche?: string[], removeForbidden?: string[], removeAiCliche?: string[] }} patch
 */
export function patchHaeshinDnaOverrides(patch = {}) {
  const current = readOverridesFile();
  let forbiddenGlobal = [...current.forbiddenGlobal];
  let aiCliche = [...current.aiCliche];

  for (const p of patch.addForbidden || []) {
    const t = String(p || "").trim();
    if (t) forbiddenGlobal.push(t);
  }
  for (const p of patch.addAiCliche || []) {
    const t = String(p || "").trim();
    if (t) aiCliche.push(t);
  }
  for (const p of patch.removeForbidden || []) {
    forbiddenGlobal = forbiddenGlobal.filter((x) => x !== String(p).trim());
  }
  for (const p of patch.removeAiCliche || []) {
    aiCliche = aiCliche.filter((x) => x !== String(p).trim());
  }

  return writeOverridesFile({ forbiddenGlobal, aiCliche });
}
