/**
 * BRICLOG MASTER REBUILD 2026 — 송출 경로 SSOT
 * Research → Fact → Delete → Eval(90) → Safe Edit(80+) → Output
 */
import { isBriclogMasterRebuildEnforced, MASTER_REBUILD_VERSION } from "@/lib/config/masterRebuildFlags";
import {
  isBriclogAlwaysDeliverEnabled,
  resolveDeliveryAllowed,
  isCustomerBodyDeliverable,
} from "@/lib/config/masterRebuildFlags";
import { applyBriclogDeleteEngine, assessDeleteEngine } from "@/lib/product/briclogDeleteEngine";
import {
  stripUnverifiedClaimsFromPack,
  assessFactFirstPack,
} from "@/lib/product/briclogFactFirstEngine";
import { evaluateReviseAndGateOutput } from "@/lib/product/briclogEvaluateFirstPipeline";
import { stripCatalogContaminationFromBlogPack } from "@/lib/product/catalogContaminationGuard";

export { isBriclogMasterRebuildEnforced, MASTER_REBUILD_VERSION };
export {
  isBriclogAlwaysDeliverEnabled,
  resolveDeliveryAllowed,
  isCustomerBodyDeliverable,
} from "@/lib/config/masterRebuildFlags";

/** STEP 9 이후 — Delete · Fact-First · 카탈로그 오염 제거 (본문 재작성 없음) */
export function applyMasterRebuildPostWritePass(pack, input = {}, opts = {}) {
  if (!pack?.sections?.length) return pack;
  if (!opts.force && !isBriclogMasterRebuildEnforced()) return pack;

  let next = applyBriclogDeleteEngine(pack, input);
  next = stripUnverifiedClaimsFromPack(next, input);
  next = stripCatalogContaminationFromBlogPack(next);

  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      masterRebuildPostWrite: true,
      masterRebuildVersion: MASTER_REBUILD_VERSION,
    },
  };
}

/** STEP 10–12 — Eval + Safe Edit (점수는 메타만, 보류 없음) */
export function runMasterRebuildQualityGate(pack, input = {}, opts = {}) {
  if (!pack?.sections?.length) {
    return {
      pack,
      evaluation: null,
      outputAllowed: false,
      withheld: false,
      steps: [],
    };
  }

  const inbound = pack;
  let next = applyMasterRebuildPostWritePass(pack, input, opts);
  const deleteAssess = assessDeleteEngine(next, input);
  const factAssess = assessFactFirstPack(next, input);

  const evalResult = evaluateReviseAndGateOutput(next, input, {
    allowRevise: opts.allowRevise !== false,
    forcedMissionProseRoute: opts.forcedMissionProseRoute,
  });

  next = evalResult.pack;
  if (
    isBriclogAlwaysDeliverEnabled() &&
    !isCustomerBodyDeliverable(next) &&
    isCustomerBodyDeliverable(inbound)
  ) {
    next = applyMasterRebuildPostWritePass(inbound, input, { ...opts, force: true });
  }

  const outputAllowed =
    isBriclogAlwaysDeliverEnabled() && isCustomerBodyDeliverable(inbound)
      ? isCustomerBodyDeliverable(next)
      : resolveDeliveryAllowed(next, evalResult.evaluation);

  return {
    pack: next,
    evaluation: evalResult.evaluation,
    outputAllowed,
    withheld: false,
    alwaysDeliver: isBriclogAlwaysDeliverEnabled(),
    steps: evalResult.steps,
    deleteAssess,
    factAssess,
    masterRebuildVersion: MASTER_REBUILD_VERSION,
  };
}

/** LLM soft-pass · mission rescue — always-deliver 모드에서는 차단 안 함 */
export function shouldBlockWriteFirstEscape() {
  if (isBriclogAlwaysDeliverEnabled()) return false;
  return false;
}

/** 서버 — 클라이언트 조사 미완 시 Tri-AI 조사 주입 */
export async function ensureServerResearchHydrated(input = {}) {
  if (typeof window !== "undefined") return input;
  if (!isBriclogMasterRebuildEnforced()) return input;
  if (input.v2ResearchReady && (input.researchFacts?.length || input.researchFirstDossier?.writable)) {
    return input;
  }
  try {
    const { applySignatureResearchServer } = await import(
      "@/lib/content/applySignatureResearchServer"
    );
    const run = await applySignatureResearchServer(input, "blog");
    if (run?.ok && run?.input) {
      return {
        ...run.input,
        _meta: {
          ...(input._meta || {}),
          serverResearchHydrated: true,
          masterRebuildVersion: MASTER_REBUILD_VERSION,
        },
      };
    }
  } catch {
    /* optional hydrate */
  }
  return input;
}
