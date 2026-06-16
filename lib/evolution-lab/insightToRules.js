/**
 * global_quality_insights 승인 → evolution-lab 규칙 파일 반영
 */
import { loadRuleSet, saveEvolvedRules, refreshEvolutionRulesCache } from "@/lib/evolution-lab/rulesStore";
import {
  loadGlobalEngineRulesFromDb,
  saveGlobalEngineRulesPatch,
  replaceGlobalEngineRules,
} from "@/lib/evolution-lab/globalEngineRulesDb";

const RULE_FILES = {
  quality: "quality_rules.json",
  prompt: "prompt_rules.json",
};

function mergeUniqueStrings(base = [], extra = []) {
  return [...new Set([...base, ...extra].filter(Boolean))];
}

function mergeRuleFile(name, patch = {}) {
  const current = loadRuleSet(name);
  const next = { ...current, ...patch };
  if (patch.forbiddenPhrases) {
    next.forbiddenPhrases = mergeUniqueStrings(
      current.forbiddenPhrases,
      patch.forbiddenPhrases
    );
  }
  if (patch.naverBlogHints) {
    next.naverBlogHints = mergeUniqueStrings(
      current.naverBlogHints,
      patch.naverBlogHints
    );
  }
  if (patch.evolutionNotes) {
    next.evolutionNotes = mergeUniqueStrings(
      current.evolutionNotes,
      patch.evolutionNotes
    );
  }
  return next;
}

/**
 * @param {{ insight_type: string, payload?: object }} insight
 */
export function buildEvolutionPatchFromInsight(insight = {}) {
  const type = insight.insight_type || "";
  const payload = insight.payload || {};
  const note = payload.message || type;

  switch (type) {
    case "ai_cliche_threshold":
      return {
        [RULE_FILES.prompt]: mergeRuleFile(RULE_FILES.prompt, {
          forbiddenPhrases: [
            "AI가 쓴 것 같",
            "GPT 톤",
            "한결같은 문장",
          ],
          evolutionNotes: [note],
        }),
        [RULE_FILES.quality]: mergeRuleFile(RULE_FILES.quality, {
          naverBlogHints: [
            "AI/GPT 톤 지적 다수 — 관용구·나열형 문장 금지 (피드백 집계)",
          ],
          evolutionNotes: [note],
        }),
      };
    case "ad_tone_guard":
      return {
        [RULE_FILES.prompt]: mergeRuleFile(RULE_FILES.prompt, {
          forbiddenPhrases: ["압도적", "지금 바로", "놓치지 마세요", "최고의 선택"],
          evolutionNotes: [note],
        }),
        [RULE_FILES.quality]: mergeRuleFile(RULE_FILES.quality, {
          naverBlogHints: ["과장·명령형·광고 톤 금지 (피드백 집계)"],
          evolutionNotes: [note],
        }),
      };
    case "auto_ban_phrase":
      return {
        [RULE_FILES.prompt]: mergeRuleFile(RULE_FILES.prompt, {
          forbiddenPhrases: payload.phrases || [],
          evolutionNotes: [note],
        }),
        [RULE_FILES.quality]: mergeRuleFile(RULE_FILES.quality, {
          naverBlogHints: ["삭제율 높은 패턴 전역 금지 (자가 진화)"],
          evolutionNotes: [note],
        }),
      };
    case "repetition_guard":
      return {
        [RULE_FILES.quality]: mergeRuleFile(RULE_FILES.quality, {
          naverBlogHints: ["동일 패턴·상담 메모 반복 금지 (피드백·행동)"],
          evolutionNotes: [note],
        }),
      };
    case "information_density":
      return {
        [RULE_FILES.quality]: mergeRuleFile(RULE_FILES.quality, {
          naverBlogHints: ["정보 단위 8개 미만 — 짧은 글 또는 추가 조사 (자가 진화)"],
          evolutionNotes: [note],
        }),
      };
    case "generation_failure":
    case "self_evolution_weekly":
    case "community_signal":
      return {
        [RULE_FILES.quality]: mergeRuleFile(RULE_FILES.quality, {
          evolutionNotes: [note, payload.message].filter(Boolean),
        }),
      };
    case "negative_feedback_rate":
      return {
        [RULE_FILES.quality]: mergeRuleFile(RULE_FILES.quality, {
          minTotalScore: Math.min(95, (loadRuleSet(RULE_FILES.quality).minTotalScore || 90) + 1),
          evolutionNotes: [note],
        }),
      };
    case "rewrite_vs_copy":
      return {
        [RULE_FILES.quality]: mergeRuleFile(RULE_FILES.quality, {
          naverBlogHints: [
            "재작성 > 복사 — 초안 품질·정보성·브랜드 일치 강화 (피드백 집계)",
          ],
          evolutionNotes: [note],
        }),
      };
    case "community_ai_opening_ban":
      return {
        [RULE_FILES.prompt]: mergeRuleFile(RULE_FILES.prompt, {
          forbiddenPhrases: payload.forbiddenCandidates || [
            "기념일을 깜빡했다",
            "퇴근길에 문득",
            "주말 아침 테이블",
          ],
          evolutionNotes: [note],
        }),
        [RULE_FILES.quality]: mergeRuleFile(RULE_FILES.quality, {
          naverBlogHints: ["커뮤니티 시그널 — AI 관용 도입·가짜 일상 장면 금지"],
          evolutionNotes: [note],
        }),
      };
    case "community_delete_pattern":
      return {
        [RULE_FILES.quality]: mergeRuleFile(RULE_FILES.quality, {
          naverBlogHints: [
            "삭제·재작성 다수 — 정보성·브랜드 일치·AI 도입 금지 강화",
          ],
          evolutionNotes: [note],
        }),
      };
    case "brand_voice":
      return {
        [RULE_FILES.prompt]: mergeRuleFile(RULE_FILES.prompt, {
          evolutionNotes: [note, "브랜드명·차별점·톤을 본문 전반에 반복 연결"],
        }),
        [RULE_FILES.quality]: mergeRuleFile(RULE_FILES.quality, {
          naverBlogHints: [
            "브랜드 톤 약함 — 브랜드 사실·차별점·고객 맥락을 문단마다 연결 (피드백)",
          ],
          evolutionNotes: [note],
        }),
      };
    case "search_intent":
      return {
        [RULE_FILES.prompt]: mergeRuleFile(RULE_FILES.prompt, {
          evolutionNotes: [
            note,
            "검색 의도(위치·이용·비교)를 제목·도입·중간에 명시",
          ],
        }),
        [RULE_FILES.quality]: mergeRuleFile(RULE_FILES.quality, {
          naverBlogHints: [
            "검색 의도 부족 — 위치·이용 방법·차별점 중 2개 이상 본문에 반영 (피드백)",
          ],
          evolutionNotes: [note],
        }),
      };
    case "density_over_length":
      return {
        [RULE_FILES.quality]: mergeRuleFile(RULE_FILES.quality, {
          naverBlogHints: [
            "분량보다 정보 밀도 — 짧아도 정보 단위·근거·활용을 우선 (피드백)",
          ],
          evolutionNotes: [note],
        }),
      };
    default:
      return null;
  }
}

/**
 * @param {{ insight_type: string, payload?: object }} insight
 * @param {{ persistToDb?: boolean, db?: object, captureRollback?: boolean }} [options]
 */
export async function applyInsightToEvolutionRules(insight = {}, options = {}) {
  const patch = buildEvolutionPatchFromInsight(insight);
  if (!patch) {
    return { applied: false, reason: "unsupported_insight_type" };
  }

  const partial = {};
  for (const [file, rules] of Object.entries(patch)) {
    partial[file] = rules;
  }

  const db = options.db || null;
  let rollbackSnapshot = null;
  if (options.captureRollback && db) {
    try {
      rollbackSnapshot = await loadGlobalEngineRulesFromDb(db);
    } catch {
      rollbackSnapshot = null;
    }
  }

  let dbResult = null;
  if (options.persistToDb !== false) {
    dbResult = await saveGlobalEngineRulesPatch(partial, db);
    if (dbResult?.ok) {
      await refreshEvolutionRulesCache(db);
    }
  }

  if (!process.env.VERCEL) {
    saveEvolvedRules(partial);
  }

  return {
    applied: true,
    insightType: insight.insight_type,
    files: Object.keys(partial),
    db: dbResult,
    rollbackSnapshot,
  };
}

/** 자동 승인 롤백 — 승인 직전 스냅샷 복원 */
export async function rollbackEvolutionRulesSnapshot(db, snapshot = {}) {
  if (!db || !snapshot || !Object.keys(snapshot).length) {
    return { ok: false, reason: "no_snapshot" };
  }
  const result = await replaceGlobalEngineRules(snapshot, db);
  if (result.ok) {
    await refreshEvolutionRulesCache(db);
  }
  return result;
}
