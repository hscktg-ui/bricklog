/**
 * North Star 레퍼런스 — GPT 품질 목표 (프롬프트 few-shot SSOT)
 * 어떤 업종·연령·입력이든 이 리듬·밀도·톤을 따라야 함.
 */
export const NORTH_STAR_REFERENCE_VERSION = "north-star-ref-v1";

export const NORTH_STAR_BLOG_REFERENCE = `【목표 품질 예시 — 방문 칼럼】
제목: 여주목마 실내수영장 오픈 소식, 직접 둘러보고 정리해 봤습니다

도입: 최근 여주목마에 실내수영장이 새롭게 오픈했다는 소식을 듣고 현장을 방문해 보았습니다.

소제목 예: 처음 들어가서 느낀 분위기 / 둘러보며 확인한 부분 / 이곳만의 장점 / 방문 전 참고 / 마무리
- 조사 팩트는 장면·경험 문장 안에 녹일 것
- 브랜드명 자연스럽게 2~4회
- 금지: 근처목마, 기준이 달라집니다, 로컬 매장 운영·예약, em-dash 도배`;

export const NORTH_STAR_PLACE_REFERENCE = `【목표 품질 예시 — 플레이스 공지】
🏊 여주목마 실내수영장 오픈

날씨 걱정 없이 즐길 수 있는 실내수영장이 새롭게 오픈했습니다.

가족 나들이, 물놀이, 휴식을 한 번에 즐길 수 있도록 준비했으며 기존 야외시설과 함께 이용 가능합니다.

여주목마는 수영장뿐 아니라 식사, 카페, 휴식공간까지 함께 운영되는 복합 문화공간입니다.

주말 방문 및 단체 이용은 사전 문의를 추천드립니다.

📍 여주목마
📞 문의 후 방문 시 더욱 편리하게 이용 가능합니다.`;

export const NORTH_STAR_INSTAGRAM_REFERENCE = `【목표 품질 예시 — 인스타 캡션】
🏊 물놀이의 계절이 돌아왔습니다.

여주목마 실내수영장이 새롭게 오픈했습니다.

햇빛 걱정 없이,
날씨 걱정 없이,
가족과 함께 편하게 즐길 수 있는 공간.

수영 후에는 식사도,
커피 한 잔의 여유도 함께.

올여름,
여주목마에서 특별한 하루를내보세요 🌿

#여주목마 #실내수영장 #여주가볼만한곳 #가족나들이 #여주여행`;

export function buildNorthStarReferencePromptBlock(channel = "blog") {
  const universal = `【브릭로그 North Star — 반드시 이 수준】
- 사람이 쓴 것처럼 읽혀야 함. 로컬 엔진·SEO·템플릿 티 금지.
- 조사 팩트는 문장 안에 녹이고, 불릿·나열·「비교·예약 판단이 수월」 금지.
- 브랜드 성장: 방문·문의·재방문으로 이어지는 자연스러운 CTA.`;

  if (channel === "place") {
    return `${universal}\n${NORTH_STAR_PLACE_REFERENCE}`;
  }
  if (channel === "instagram") {
    return `${universal}\n${NORTH_STAR_INSTAGRAM_REFERENCE}`;
  }
  return `${universal}\n${NORTH_STAR_BLOG_REFERENCE}`;
}

export function buildNorthStarBrandGrowthBrief() {
  return `【브랜드 성장 목표】
글은 검색용 문장이 아니라 「이번 달 이 브랜드를 어떻게 운영할지」 돕는 자산.
독자가 저장·공유·방문·문의하고 싶게 — 신뢰·구체성·현장감을 우선.`;
}
