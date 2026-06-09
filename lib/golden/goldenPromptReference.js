/**
 * Golden Dataset — 생성 프롬프트 참조 블록 (상위 5개)
 */
import { getGoldenSamplesForInput } from "@/lib/golden/goldenDatasetStore";
import { goldenIndustryLabel, resolveGoldenIndustryKey } from "@/lib/golden/goldenIndustryKeys";

/**
 * @param {object} input
 */
export function buildGoldenReferencePromptBlock(input = {}) {
  const key = resolveGoldenIndustryKey(input);
  const samples = getGoldenSamplesForInput(input, 5);
  if (!samples.length) return "";

  const lines = [
    "【GOLDEN DATASET — 해신기획 우수글 기준 (재학습 아님·품질 벤치마크)】",
    `업종: ${goldenIndustryLabel(key)} · 아래 우수글의 구조·정보밀도·톤을 따르되 문장 복사 금지`,
    "구조: 시즌/상황 도입 → 지역·브랜드 → 구체 명칭 3+ → 목적별 선택 → 실용 팁 → 브랜드 운영 → 여운 마무리",
    "금지 AI 냄새: 「이용」「중립적으로 정리」「관련해서 보면」「비교가 수월해요」「확인해봤어요」",
  ];

  for (let i = 0; i < samples.length; i += 1) {
    const s = samples[i];
    const excerpt = String(s.content || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 280);
    lines.push(
      `참고${i + 1}「${s.title}」(${s.writing_style || "column"}) — ${excerpt}…`
    );
  }

  return lines.join("\n");
}
