import fs from "fs";
import path from "path";
import {
  filterEvolutionHintsForIndustry,
  filterForbiddenPhrasesForIndustry,
  resolveIndustryScopedStructureHint,
} from "@/lib/product/industryScopedRulesEngine";

const CONFIG_DIR = path.join(process.cwd(), "config", "evolution-lab");
const EVOLVED_DIR = path.join(process.cwd(), ".data", "evolution-lab", "rules");

const RULE_FILES = [
  "quality_rules.json",
  "prompt_rules.json",
  "persona_rules.json",
  "emotion_rules.json",
];

/** Vercel·서버리스 — DB 규칙 오버레이 (refreshEvolutionRulesCache) */
let dbRulesOverlay = null;
let dbRulesLoadedAt = 0;
const DB_RULES_TTL_MS = 60_000;

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function ensureEvolvedDir() {
  fs.mkdirSync(EVOLVED_DIR, { recursive: true });
}

export function setDbRulesOverlay(overlay = {}) {
  dbRulesOverlay = overlay && typeof overlay === "object" ? overlay : null;
  dbRulesLoadedAt = Date.now();
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} [db]
 */
export async function refreshEvolutionRulesCache(db) {
  try {
    const { loadGlobalEngineRulesFromDb } = await import(
      "@/lib/evolution-lab/globalEngineRulesDb"
    );
    const overlay = await loadGlobalEngineRulesFromDb(db);
    setDbRulesOverlay(overlay);
    return { ok: true, keys: Object.keys(overlay).length };
  } catch {
    return { ok: false };
  }
}

function dbOverlayStale() {
  return !dbRulesLoadedAt || Date.now() - dbRulesLoadedAt > DB_RULES_TTL_MS;
}

export function loadRuleSet(name) {
  const base = readJson(path.join(CONFIG_DIR, name), {});
  const evolvedPath = path.join(EVOLVED_DIR, name);
  let merged = { ...base, _source: "config" };
  if (fs.existsSync(evolvedPath)) {
    const evolved = readJson(evolvedPath, {});
    merged = {
      ...merged,
      ...evolved,
      version: Math.max(base.version || 1, evolved.version || 1),
      _source: "evolved",
    };
  }
  const dbEvolved = dbRulesOverlay?.[name];
  if (dbEvolved && typeof dbEvolved === "object") {
    merged = {
      ...merged,
      ...dbEvolved,
      forbiddenPhrases: [
        ...new Set([
          ...(merged.forbiddenPhrases || []),
          ...(dbEvolved.forbiddenPhrases || []),
        ]),
      ],
      naverBlogHints: [
        ...new Set([
          ...(merged.naverBlogHints || []),
          ...(dbEvolved.naverBlogHints || []),
        ]),
      ],
      evolutionNotes: [
        ...new Set([
          ...(merged.evolutionNotes || []),
          ...(dbEvolved.evolutionNotes || []),
        ]),
      ],
      version: Math.max(merged.version || 1, dbEvolved.version || 1),
      _source: merged._source ? `${merged._source}+db` : "db",
    };
  }
  if (dbOverlayStale() && process.env.VERCEL) {
    void refreshEvolutionRulesCache();
  }
  return merged;
}

export function loadAllRules() {
  return {
    quality: loadRuleSet("quality_rules.json"),
    prompt: loadRuleSet("prompt_rules.json"),
    persona: loadRuleSet("persona_rules.json"),
    emotion: loadRuleSet("emotion_rules.json"),
  };
}

export function saveEvolvedRules(partial) {
  ensureEvolvedDir();
  for (const key of RULE_FILES) {
    if (!partial[key]) continue;
    const filePath = path.join(EVOLVED_DIR, key);
    const current = loadRuleSet(key);
    const next = {
      ...current,
      ...partial[key],
      version: (current.version || 1) + 1,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(filePath, JSON.stringify(next, null, 2), "utf8");
  }
}

/** LLM 프롬프트에 주입할 연구·규칙 요약 (업종 격리) */
export function getEvolutionPromptAddon(input = {}) {
  const rules = loadAllRules();
  const hints = filterEvolutionHintsForIndustry(rules.quality.naverBlogHints || [], input);
  const forbidden = filterForbiddenPhrasesForIndustry(rules.prompt.forbiddenPhrases || [], input);
  const structure = resolveIndustryScopedStructureHint(input);

  const lines = [
    structure ? `구조(업종): ${structure}` : null,
    ...hints,
    ...forbidden.map((p) => `금지 표현: ${p}`),
  ].filter(Boolean);

  if (!lines.length) return "";
  return `\n【Self Evolution Lab 규칙 — 현재 업종】\n${lines.slice(0, 12).join("\n")}`;
}
