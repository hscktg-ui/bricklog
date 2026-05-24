import fs from "fs";
import path from "path";

const CONFIG_DIR = path.join(process.cwd(), "config", "evolution-lab");
const EVOLVED_DIR = path.join(process.cwd(), ".data", "evolution-lab", "rules");

const RULE_FILES = [
  "quality_rules.json",
  "prompt_rules.json",
  "persona_rules.json",
  "emotion_rules.json",
];

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

export function loadRuleSet(name) {
  const base = readJson(path.join(CONFIG_DIR, name), {});
  const evolvedPath = path.join(EVOLVED_DIR, name);
  if (!fs.existsSync(evolvedPath)) return { ...base, _source: "config" };
  const evolved = readJson(evolvedPath, {});
  return {
    ...base,
    ...evolved,
    version: Math.max(base.version || 1, evolved.version || 1),
    _source: "evolved",
  };
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

/** LLM 프롬프트에 주입할 연구·규칙 요약 */
export function getEvolutionPromptAddon() {
  const rules = loadAllRules();
  const hints = [
    ...(rules.quality.naverBlogHints || []),
    ...(rules.prompt.forbiddenPhrases || []).map((p) => `금지 표현: ${p}`),
    rules.prompt.structureTemplate
      ? `구조: ${rules.prompt.structureTemplate}`
      : null,
  ].filter(Boolean);

  if (!hints.length) return "";
  return `\n【Self Evolution Lab 규칙】\n${hints.slice(0, 12).join("\n")}`;
}
