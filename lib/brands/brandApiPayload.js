/** API POST/PATCH용 — DB 컬럼만 (클라이언트 id 등 제외) */

export function brandDraftToApiBody(draft) {
  if (!draft) return {};
  return {
    brandName: draft.brandName,
    brandType: draft.brandType,
    industry: draft.industry,
    region: draft.region,
    tone: draft.tone,
    kpiGoal: draft.kpiGoal,
    brandDescription: draft.brandDescription,
    mainKeyword: draft.mainKeyword,
    subKeyword: draft.subKeyword,
    includePhrases: draft.includePhrases,
    forbiddenWords: draft.forbiddenWords || draft.bannedWords,
    emojiDensity: draft.emojiDensity || draft.emojiLevel,
    preferredSentenceStyle: draft.preferredSentenceStyle,
    contentArchive: draft.contentArchive,
    recentContent: draft.recentContent,
    learning: draft.learning,
    rewriteHints: draft.rewriteHints,
    rewritePrefs: draft.rewritePrefs,
    editorAIActions: draft.editorAIActions,
    preferredPhrases: draft.preferredPhrases,
    frequentlyUsedExpressions: draft.frequentlyUsedExpressions,
    avoidedExpressions: draft.avoidedExpressions,
    successfulHooks: draft.successfulHooks,
    highPerformingPatterns: draft.highPerformingPatterns,
  };
}
