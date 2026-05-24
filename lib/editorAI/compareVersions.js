export function compareEditorScores(beforeScores, afterScores) {
  const beforeOverall =
    beforeScores?.common?.overall ?? beforeScores?.summary?.overall;
  const afterOverall =
    afterScores?.common?.overall ?? afterScores?.summary?.overall;
  if (beforeOverall == null || afterOverall == null) {
    return { before: 0, after: 0, delta: 0, improved: false };
  }
  const before = beforeOverall;
  const after = afterOverall;
  return {
    before,
    after,
    delta: after - before,
    improved: after > before,
  };
}
