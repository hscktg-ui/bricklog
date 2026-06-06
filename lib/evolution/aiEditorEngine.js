/**
 * AI 편집장 — 생성 후 감사(audit) 단계 통합
 * 편집 품질 검수 + 발행 가능 질문(FINAL QUESTION)
 */
import {
  assertEditorPreOutput,
  applyEditorPreOutputCorrection,
} from "@/lib/content/editorPreOutputGate";
import { assessPublishWithoutEditing } from "@/lib/product/coreContentEngine";
import { runEditorAI } from "@/lib/editorAI";

export const AI_EDITOR_VERSION = "v1";

/**
 * @param {object} pack
 * @param {object} input
 * @param {object} [ctx]
 */
export function runAiEditorAudit(pack, input = {}, ctx = {}) {
  if (!pack?.sections?.length) {
    return {
      ok: false,
      stage: "audit",
      version: AI_EDITOR_VERSION,
      reasons: ["empty_pack"],
      userMessage: "작성 결과가 비어 있어 출력할 수 없습니다.",
      pack,
    };
  }

  const evalCtx = { ...ctx, ...input, input };
  const corrected = applyEditorPreOutputCorrection(pack, evalCtx, input);
  let next = corrected.pack;
  const editorGate = assertEditorPreOutput(next, evalCtx, input);
  const publishAudit = assessPublishWithoutEditing(next, input, evalCtx);
  const editorReport = runEditorAI("blog", next, evalCtx);

  const reasons = [];
  if (!editorGate.ok) reasons.push(...(editorGate.reasons || ["editor_gate_fail"]));
  if (!publishAudit.publishReady) {
    reasons.push(...(publishAudit.reasons || ["not_publish_ready"]));
  }
  if (!editorReport.pass) {
    const issueIds = (editorReport.issues || [])
      .filter((i) => i.severity === "fail")
      .map((i) => i.id);
    reasons.push(...issueIds.map((id) => `editor_${id}`));
  }

  const ok = reasons.length === 0;

  return {
    ok,
    stage: "audit",
    version: AI_EDITOR_VERSION,
    reasons: [...new Set(reasons)],
    pack: next,
    editorGate,
    publishAudit,
    editorReport,
    publishQuestion: publishAudit.question,
    publishAnswer: publishAudit.answer,
    publishReady: publishAudit.publishReady,
    userMessage: ok
      ? null
      : "편집장 검수 기준에 맞지 않아 수정 없이 발행하기 어렵습니다. 조사·구성을 보강합니다.",
  };
}

/**
 * 감사 통과 시에만 출력 메타 부착
 */
export function attachAiEditorMeta(pack, audit = {}) {
  if (!pack) return pack;
  return {
    ...pack,
    _meta: {
      ...(pack._meta || {}),
      aiEditorVersion: AI_EDITOR_VERSION,
      aiEditorAudit: {
        ok: audit.ok,
        reasons: audit.reasons || [],
        publishReady: audit.publishReady,
        publishQuestion: audit.publishQuestion,
        publishAnswer: audit.publishAnswer,
        editorScore: audit.editorReport?.summary?.overall,
      },
      passOutput: audit.ok && audit.publishReady,
      publishReady: audit.publishReady,
    },
  };
}
