import { detectContentIssues } from "./detectIssues";

export function suggestImprovements(channel, content, ctx = {}, scores = null) {
  const { issues, text } = detectContentIssues(channel, content, ctx);
  const tips = [];

  if (issues.some((i) => i.id === "repeat" || i.id === "keyword_stuff")) {
    tips.push("지역·메인 키워드가 몰린 문단은 한 번만 자연스럽게 언급하는 편이 좋습니다.");
  }
  if (issues.some((i) => i.id === "gpt")) {
    tips.push("도입·마무리의 안내형 문장을 짧은 생활 장면으로 바꾸면 읽기 편해집니다.");
  }
  if (channel === "blog") {
    const opener = content?.sections?.[0]?.body || "";
    if (opener.length < 80) {
      tips.push("도입부에 퇴근길·주말 등 작은 장면을 하나 더 넣으면 흡입력이 좋아집니다.");
    }
    if (scores?.channel?.lengthOk < 80) {
      tips.push("본문이 1,800자에 못 미칩니다. 장면 하나를 더 보강해 보세요.");
    }
    if (scores?.common?.repeatRisk > 20) {
      tips.push("2번째 문단 전후로 비슷한 표현이 보입니다. 문장 시작을 다양하게 바꿔 보세요.");
    }
  }
  if (channel === "place") {
    if ((text || "").length > 400) {
      tips.push("플레이스 소식은 핵심 메시지를 한 문장으로 줄이는 것이 좋습니다.");
    }
    if (/블로그|키워드|체류/.test(text)) {
      tips.push("공지형 한 줄 + 운영 정보만 남기고 블로그 설명형 문장은 줄여 보세요.");
    }
  }
  if (channel === "instagram") {
    const hook = content?.hook || "";
    if (hook.length > 45) {
      tips.push("인스타그램 Hook은 조금 더 짧게 줄이면 저장성이 높아집니다.");
    }
    if (!/\n\n/.test(content?.lineBreakBody || "")) {
      tips.push("줄바꿈 리듬을 위해 빈 줄을 한두 곳 넣어 보세요.");
    }
  }
  if (channel === "image") {
    if ((text || "").length < 60) {
      tips.push("이미지 프롬프트에 지역·무드·비율 키워드를 한 줄 더 보강해 보세요.");
    }
  }
  if (issues.some((i) => i.id === "brand_leak")) {
    tips.push("다른 브랜드명이 섞였습니다. 현재 브랜드 맥락만 남기세요.");
  }
  if (issues.some((i) => i.id === "forbidden")) {
    tips.push("금지어가 포함되어 있습니다. 브랜드 창고의 제외 표현을 확인해 주세요.");
  }

  if (!tips.length) {
    tips.push("전반적으로 양호합니다. 톤만 살짝 다듬으면 발행 전에 바로 쓸 수 있는 수준입니다.");
  }

  return tips.slice(0, 5);
}
