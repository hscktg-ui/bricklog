import fs from "fs/promises";
import path from "path";
import { createServiceSupabase } from "@/lib/supabase/server";

const DATA_DIR = path.join(process.cwd(), ".data", "quality-training");

export async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export function runFilePath(runId) {
  return path.join(DATA_DIR, `${runId}.json`);
}

export async function saveRunState(state) {
  await ensureDataDir();
  const payload = {
    ...state,
    seenInputHashes: state.seenInputHashes
      ? [...state.seenInputHashes]
      : [],
    results: state.results?.slice(-500),
  };
  await fs.writeFile(runFilePath(state.runId), JSON.stringify(payload, null, 0), "utf8");

  const db = createServiceSupabase();
  if (!db) return;

  try {
    await db.from("quality_training_runs").upsert(
      {
      id: state.runId,
      user_id: state.userId,
      status: state.status,
      options: state.options || {},
      progress: state.progress || {},
      report: state.report || null,
      started_at: state.startedAt,
      finished_at: state.finishedAt || null,
      updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    const last = state.results?.[state.results.length - 1];
    if (last) {
      await db.from("quality_training_results").insert({
        run_id: state.runId,
        test_id: last.testId,
        category: last.category,
        brand_type: last.brandType,
        channel: last.channel,
        persona: last.persona,
        emotion_tone: last.emotionTone,
        input_prompt: last.inputPrompt,
        generated_content: last.generatedContent,
        first_score: last.firstScore,
        final_score: last.finalScore,
        rewrite_count: last.rewriteCount,
        fail_reason: last.failReason,
        pass_or_fail: last.passOrFail,
      });
    }
  } catch (e) {
    console.error("[quality-training store]", e.message);
  }
}

export async function loadRunState(runId) {
  try {
    const raw = await fs.readFile(runFilePath(runId), "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function loadLatestRun() {
  await ensureDataDir();
  const files = await fs.readdir(DATA_DIR);
  const jsonFiles = files.filter((f) => f.endsWith(".json")).sort().reverse();
  if (!jsonFiles.length) return null;
  const raw = await fs.readFile(path.join(DATA_DIR, jsonFiles[0]), "utf8");
  return JSON.parse(raw);
}
