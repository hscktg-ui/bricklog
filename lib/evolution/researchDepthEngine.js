/** RESEARCH DEPTH ENGINE */
import { collectMergedResearchFacts } from "@/lib/product/researchReadiness";
import { assessSubjectMatterCoverage } from "@/lib/product/coreContentEngine";

export function assessResearchDepth(input = {}) {
  const facts = collectMergedResearchFacts(input, input.v2AxisParsed, input.research);
  const subject = assessSubjectMatterCoverage(input, {}, null);
  const count = Math.max(facts.length, subject.count);
  const required = subject.required;
  const min = required ? 5 : 2;
  return {
    ok: count >= min,
    factCount: facts.length,
    subjectAxes: subject.count,
    min,
    required,
    blocked: required && count < 5,
  };
}
