/**
 * 누적 데이터 자산 → LLM 프롬프트 블록 (원문·PII 없음)
 */
export function buildDataAssetPromptAddon({
  rollup = null,
  learningBrief = "",
  profile = null,
} = {}) {
  const blocks = [];

  if (rollup?.generationCount > 0) {
    const chParts = Object.entries(rollup.channels || {})
      .filter(([, n]) => n > 0)
      .map(([k, n]) => `${k} ${n}편`)
      .join(", ");
    const qual =
      rollup.avgQualityScore != null
        ? ` · 평균 품질 ${rollup.avgQualityScore}점`
        : "";
    blocks.push(
      `【브랜드 자산】 이 브랜드에서 최근 ${rollup.generationCount}편 생성${chParts ? ` (${chParts})` : ""}${qual}. 톤·패턴을 이어가되 문장 복사 금지.`
    );
  }

  if (rollup?.feedbackCount > 0) {
    const good = rollup.feedbackRatios?.good ?? 0;
    const bad = rollup.feedbackRatios?.bad ?? 0;
    if (bad > 0) {
      blocks.push(
        `【피드백 자산】 부정 반응 ${bad}건 — 지적 패턴을 반영해 같은 실수를 줄이세요.`
      );
    } else if (good > 0) {
      blocks.push(`【피드백 자산】 긍정 반응 ${good}건 — 현재 톤을 유지하세요.`);
    }
  }

  if (rollup?.hasStyleFingerprint && profile?.styleFingerprint) {
    const fp = profile.styleFingerprint;
    const fpLine = [
      fp.sentenceLengthBand && `문장 ${fp.sentenceLengthBand}`,
      fp.emojiDensity && fp.emojiDensity !== "none" && `이모지 ${fp.emojiDensity}`,
    ]
      .filter(Boolean)
      .join(" · ");
    if (fpLine) blocks.push(`【스타일 지문】 ${fpLine}`);
  }

  if (learningBrief) {
    blocks.push(`【학습 프로필】 ${learningBrief}`);
  }

  return blocks.join("\n").slice(0, 2000);
}
