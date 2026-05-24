import { detectContentIssues } from "./detectIssues";
import { scoreContent } from "./scoreContent";
import { suggestImprovements } from "./suggestImprovements";
import { autoImproveContent, EDITOR_IMPROVE_ACTIONS } from "./autoImprove";
import { compareEditorScores } from "./compareVersions";

export { detectContentIssues, scoreContent, suggestImprovements, autoImproveContent, compareEditorScores, EDITOR_IMPROVE_ACTIONS };

export function runEditorAI(channel, content, ctx = {}) {
  const issues = detectContentIssues(channel, content, ctx);
  const scores = scoreContent(channel, content, ctx, issues);
  const suggestions = suggestImprovements(channel, content, ctx, scores);

  return {
    channel,
    mode: "rule",
    pass: issues.pass && scores.pass !== false,
    issues: issues.issues,
    scores,
    suggestions,
    summary: {
      overall: scores.common.overall,
      brandFit: scores.common.brandFit,
      gptRisk: scores.common.gptRisk,
      repeatRisk: scores.common.repeatRisk,
      timeliness: scores.common.timeliness,
      channelFit: scores.common.channelFit,
    },
    at: new Date().toISOString(),
  };
}

export function attachEditorAI(channel, pack, ctx) {
  if (!pack) return pack;
  const report = runEditorAI(channel, pack, ctx);
  return {
    ...pack,
    editorAI: report,
    _meta: {
      ...pack._meta,
      editorAI: report,
    },
  };
}
