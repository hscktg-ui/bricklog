/**
 * V17 출력 전 검수 — FINAL CHECK 9항 + Reviewer 80점
 */
import { getChannelFullText } from "@/lib/content/channelPack";
import { assertV14PreOutput } from "@/lib/content/v14ContentGate";
import { scoreInformationYield } from "@/lib/content/informationEngine";
import { detectDuplicateKillerIssues } from "@/lib/content/duplicateKillerEngine";
import { detectBrandContentIssues } from "@/lib/content/brandContentEngine";
import { detectCoverageGateFailures } from "@/lib/content/knowledgeCoverageGate";
import { detectPerspectiveIssues } from "@/lib/content/perspectiveEngine";
import { assertEditorPreOutput } from "@/lib/content/editorPreOutputGate";
import {
  MASTER_ENGINE_V17_PRE_OUTPUT_CHECKLIST,
  V17_REVIEWER_PASS_SCORE,
} from "@/lib/content/contentIntelligenceV17";

const FICTION_OUTPUT_RE =
  /(서울에\s*거주하는\s*한\s*사용자|부산의\s*한\s*요리\s*블로거|한\s*고객은\s*이렇게\s*말했다|방문자가\s*두\s*배로\s*늘었다|수면의\s*질이\s*개선되었다|사용\s*후\s*만족도가\s*높았다|임의로\s*만든\s*후기)/i;

/**
 * @param {object} pack
 * @param {string} channel
 * @param {object} ctx
 */
export function assertV17PreOutput(pack, channel = "blog", ctx = {}) {
  const input = ctx.input || ctx;
  const full = getChannelFullText(pack, channel);
  const reasons = [];
  const checklist = {};

  const v14 = assertV14PreOutput(pack, channel, { ...ctx, input });
  Object.assign(checklist, v14.checklist || {});
  if (!v14.ok) reasons.push(...v14.reasons);

  checklist.no_fiction = !FICTION_OUTPUT_RE.test(full);
  if (!checklist.no_fiction && !reasons.includes("fiction_detected")) {
    reasons.push("fiction_detected");
  }

  const info = scoreInformationYield(full, { ...ctx, input }, channel);
  checklist.information_yield_80 = info.ok;
  if (channel === "blog" && !info.ok) {
    reasons.push("information_yield_low");
  }

  const dup = detectDuplicateKillerIssues(full);
  checklist.duplicate_killer_ok = dup.ok;
  if (!dup.ok && !reasons.includes("duplicate_killer_fail")) {
    reasons.push("duplicate_killer_fail");
  }

  if (channel === "blog") {
    const brandCheck = detectBrandContentIssues(pack, ctx, input);
    checklist.brand_content_ok = brandCheck.ok;
    if (!brandCheck.ok) {
      for (const issue of brandCheck.issues) {
        const code = `brand_${issue.type}`;
        if (!reasons.includes(code)) reasons.push(code);
      }
    }

    const coverageGate = detectCoverageGateFailures(pack, input);
    checklist.coverage_gate_ok = coverageGate.ok;
    if (!coverageGate.ok) {
      const critical = coverageGate.failures.filter((f) =>
        ["numbered_duplicate_heading", "duplicate_heading", "thin_section"].includes(f.type)
      );
      for (const f of critical.slice(0, 4)) {
        const code = `coverage_${f.type}`;
        if (!reasons.includes(code)) reasons.push(code);
      }
    }

    const perspectiveCheck = detectPerspectiveIssues(pack, ctx, input);
    checklist.perspective_ok = perspectiveCheck.ok;
    if (!perspectiveCheck.ok) {
      for (const issue of perspectiveCheck.issues) {
        const code = `perspective_${issue.type}`;
        if (!reasons.includes(code)) reasons.push(code);
      }
    }

    const editor = assertEditorPreOutput(pack, ctx, input);
    checklist.editor_pre_output = editor.ok;
    Object.assign(checklist, editor.checklist || {});
    if (!editor.ok) {
      for (const r of editor.reasons || []) {
        if (!reasons.includes(r)) reasons.push(r);
      }
    }
  }

  const reviewerScore = Math.min(
    v14.ok ? 92 : 70,
    info.score,
    dup.ok ? 100 : 75,
    channel === "blog" && checklist.brand_content_ok === false ? 78 : 100,
    channel === "blog" && checklist.coverage_gate_ok === false ? 76 : 100,
    channel === "blog" && checklist.perspective_ok === false ? 80 : 100,
    channel === "blog" && checklist.editor_pre_output === false ? 75 : 100
  );
  checklist.reviewer_pass = reviewerScore >= V17_REVIEWER_PASS_SCORE;

  return {
    ok: [...new Set(reasons)].length === 0,
    reasons: [...new Set(reasons)],
    checklist,
    reviewerScore,
    information: info,
    duplicate: dup,
    v14,
    masterChecklist: MASTER_ENGINE_V17_PRE_OUTPUT_CHECKLIST,
    reviewerPassThreshold: V17_REVIEWER_PASS_SCORE,
  };
}

export {
  assertV14PreOutput,
  assertV13PreOutput,
  scoreInputTopicDominance,
  inputTopicKeywords,
} from "@/lib/content/v14ContentGate";
