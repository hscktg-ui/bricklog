/** 4차 분류 — 톤앤매너 */
export const TONE_OPTIONS = [
  { value: "emotional", label: "감성형" },
  { value: "premium", label: "프리미엄형" },
  { value: "informative", label: "정보형" },
  { value: "trust", label: "신뢰형" },
  { value: "lifestyle", label: "생활형" },
  { value: "minimal", label: "미니멀형" },
  { value: "brand", label: "브랜드형" },
  { value: "mz", label: "MZ형" },
  { value: "medical", label: "병원형" },
  { value: "department", label: "백화점형" },
];

export function getToneModifier(key) {
  const map = {
    emotional: {
      label: "감성형",
      value: "emotional",
      voice: "따뜻하고 여운이 남는 말투로",
      ending: "오늘 하루도 좋은 마음이 이어지길 바랍니다.",
      instaStyle: "감성·여백·과한 이모지 없음",
      placeTone: "부드럽고 친근한 안내",
    },
    premium: {
      label: "프리미엄형",
      value: "premium",
      voice: "절제된 표현과 품격 있는 문장으로",
      ending: "품격 있는 경험으로 모시겠습니다.",
      instaStyle: "미니멀·고급·여백",
      placeTone: "간결하고 품격 있는 소식",
    },
    informative: {
      label: "정보형",
      value: "informative",
      voice: "명확하고 중립적인 문장으로",
      ending: "도움이 되셨다면 저장해 두셔도 좋습니다.",
      instaStyle: "정보·팁·체크리스트",
      placeTone: "사실 중심 안내",
    },
    trust: {
      label: "신뢰형",
      value: "trust",
      voice: "신뢰감 있고 차분한 문장으로",
      ending: "궁금한 점은 편하게 문의해 주세요.",
      instaStyle: "신뢰·절제·광고 최소",
      placeTone: "믿고 읽을 수 있는 안내",
    },
    lifestyle: {
      label: "생활형",
      value: "lifestyle",
      voice: "옆집 이웃처럼 편안한 말투로",
      ending: "편하게 들러 주세요.",
      instaStyle: "일상·공감·동네",
      placeTone: "편한 말투의 소식",
    },
    minimal: {
      label: "미니멀형",
      value: "minimal",
      voice: "짧고 핵심만 담은 문장으로",
      ending: "필요하실 때 참고해 주세요.",
      instaStyle: "짧은 문장·여백",
      placeTone: "핵심만 전달",
    },
    brand: {
      label: "브랜드형",
      value: "brand",
      voice: "브랜드 메시지가 분명한 문장으로",
      ending: "브랜드와 함께해 주셔서 감사합니다.",
      instaStyle: "브랜드 톤·일관성",
      placeTone: "브랜드 소식",
    },
    mz: {
      label: "MZ형",
      value: "mz",
      voice: "가볍지만 무례하지 않은 말투로",
      ending: "저장해 두었다가 필요할 때 꺼내보세요.",
      instaStyle: "트렌디하되 과장·밈 남용 없음",
      placeTone: "친근한 요즘 말투",
    },
    medical: {
      label: "병원형",
      value: "medical",
      voice: "신뢰감 있고 과장 없는 설명으로",
      ending: "정확한 상담은 내원·전화로 문의해 주세요.",
      instaStyle: "광고성·과장 표현 자제",
      placeTone: "의료 안내형, 과장 금지",
    },
    department: {
      label: "백화점형",
      value: "department",
      voice: "정돈되고 품격 있는 서비스 말투로",
      ending: "방문을 기다리겠습니다.",
      instaStyle: "고급 리테일·정돈",
      placeTone: "프리미엄 리테일 안내",
    },
  };
  return map[key] || map.lifestyle;
}
