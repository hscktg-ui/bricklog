/**
 * BRICLOG 저자 지시 — Golden Benchmark 수준으로 집필
 */
import { resolveGoldenIndustryKey, goldenIndustryLabel } from "@/lib/golden/goldenIndustryKeys";
import { getGoldenSamplesForInput } from "@/lib/golden/goldenDatasetStore";

export function buildBriclogAuthorMissionBlock(input = {}) {
  const key = resolveGoldenIndustryKey(input);
  const samples = getGoldenSamplesForInput(input, 3);
  const top = samples[0];

  return [
    "【BRICLOG 집필 미션 — 사용자는 우수글을 쓰지 않습니다】",
    "당신은 해신기획 편집장입니다. 아래 Golden Benchmark와 같은 밀도·담백함·구조로 처음부터 작성합니다.",
    "문장 복사 금지 · 브랜드·지역·메뉴·품목은 입력·조사 범위만 · 광고문 금지",
    `업종: ${goldenIndustryLabel(key)} · 목표: 벤치마크 ${top?.brand_presence_score || 90}점급`,
    "필수: 일상 도입 → 검색 의도 답변 → 구체 명칭 3+ → 선택 기준 → 실용 팁 → 브랜드 자연 노출 → 약한 마무리",
    "말투: ~습니다체 통일 · 메모해 뒀어요·안녕하세요·알아보겠습니다 금지",
    "당신의 출력이 곧 브릭로그의 우수글입니다. 평범한 AI 초안이 아니라 기준급 칼럼을 쓰세요.",
  ].join("\n");
}
