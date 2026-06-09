/**
 * Golden Dataset — 생성 프롬프트 참조 블록 (상위 벤치마크)
 */
import { getGoldenSamplesForInput } from "@/lib/golden/goldenDatasetStore";
import { goldenIndustryLabel, resolveGoldenIndustryKey } from "@/lib/golden/goldenIndustryKeys";
import { buildBriclogAuthorMissionBlock } from "@/lib/golden/goldenAuthorDirective";

/**
 * @param {object} input
 */
export function buildGoldenReferencePromptBlock(input = {}) {
  const key = resolveGoldenIndustryKey(input);
  const samples = getGoldenSamplesForInput(input, 5);
  if (!samples.length) return "";

  const lines = [
    buildBriclogAuthorMissionBlock(input),
    "【GOLDEN BENCHMARK — 이 품질로 새 글을 집필】",
    `업종: ${goldenIndustryLabel(key)} · 등록 벤치마크 ${samples.length}건 · 문장 복사 금지·구조·밀도 동일`,
    "구조: 시즌/상황 도입 → 검색 의도 → 구체 명칭 3+ → 목적별 선택 → 실용 팁 → 브랜드 운영 → 여운 마무리",
    "금지: 이용·중립적으로 정리·비교가 수월해요·확인해봤어요·안녕하세요·알아보겠습니다",
  ];

  for (let i = 0; i < samples.length; i += 1) {
    const s = samples[i];
    const excerpt = String(s.content || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 420);
    lines.push(
      `벤치${i + 1}「${s.title}」(${s.writing_style || "column"}·${s.brand_presence_score || 90}점) — ${excerpt}…`
    );
  }

  lines.push("위 벤치마크 수준으로, 입력 브랜드·주제에 맞는 새 글을 작성하세요.");

  return lines.join("\n");
}
