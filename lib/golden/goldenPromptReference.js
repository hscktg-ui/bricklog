/**
 * Golden Dataset — 생성 프롬프트 참조 블록 (상위 벤치마크)
 */
import { getGoldenSamplesForInput } from "@/lib/golden/goldenDatasetStore";
import { goldenIndustryLabel, resolveGoldenIndustryKey } from "@/lib/golden/goldenIndustryKeys";
import { buildBriclogAuthorMissionBlock } from "@/lib/golden/goldenAuthorDirective";

/**
 * @param {object} input
 */
const EDITORIAL_STRUCTURE_LINE =
  "구조: 시즌/상황 도입 → 검색 의도 → 구체 명칭 3+ → 목적별 선택 → 실용 팁 → 브랜드 운영 → 여운 마무리";
const FORBIDDEN_LINE =
  "금지: 이용·중립적으로 정리·비교가 수월해요·확인해봤어요·안녕하세요·알아보겠습니다";

export function buildGoldenReferencePromptBlock(input = {}) {
  const key = resolveGoldenIndustryKey(input);
  const samples = getGoldenSamplesForInput(input, 5);
  const lines = [buildBriclogAuthorMissionBlock(input)];

  if (!samples.length) {
    lines.push(
      `【해신 편집 구조 — ${goldenIndustryLabel(key)} DNA·조사 기준】`,
      "벤치마크 코퍼스 없음 — 업종 DNA·조사 팩트·입력만으로 해신기획 수준 집필",
      EDITORIAL_STRUCTURE_LINE,
      FORBIDDEN_LINE,
      "입력·조사에 없는 메뉴·가격·행사·스펙 단정 금지"
    );
    return lines.join("\n");
  }

  lines.push(
    "【GOLDEN BENCHMARK — 참고만, 문장 복사 금지】",
    `업종: ${goldenIndustryLabel(key)} · 참고 벤치마크 ${samples.length}건 · 구조·밀도만 참고`,
    EDITORIAL_STRUCTURE_LINE,
    FORBIDDEN_LINE
  );

  for (let i = 0; i < samples.length; i += 1) {
    const s = samples[i];
    const excerpt = String(s.content || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 420);
    lines.push(
      `참고${i + 1}「${s.title}」(${s.writing_style || "column"}·${s.brand_presence_score || 90}점) — ${excerpt}…`
    );
  }

  lines.push("벤치마크는 참고용입니다. 입력 브랜드·주제·조사에 맞는 새 글을 작성하세요.");

  return lines.join("\n");
}
