/**
 * 검색 신호 → 자연어 재해석 (원문 복사 금지)
 */

const SIGNAL_TO_VOICE = [
  { match: /24\s*시간|24시간|무인|셀프/, voice: "늦은 시간에도 부담 없이 이용할 수 있는 운영" },
  { match: /꽃다발|생화|플라워/, voice: "생화·꽃다발 중심으로 구성을 맞추는 방식" },
  { match: /예약|상담/, voice: "방문·예약 전에 일정을 맞추기 쉬운 구조" },
  { match: /매트리스|수면|침대/, voice: "수면·체험 후 상담이 중심인 매장" },
  { match: /세탁|케어|클리닝/, voice: "이용 방법·케어 과정을 명확히 안내하는 운영" },
  { match: /시즌|기념|어버이|가정의달/, voice: "시즌·기념일 수요에 맞춘 구성 변화" },
  { match: /주차|입구|동선/, voice: "첫 방문 시 동선·주차를 함께 확인하는 편이 좋음" },
  { match: /프리미엄|럭셔리/, voice: "과한 홍보보다 분위기와 체험이 먼저 전해지는 톤" },
  { match: /가족|부모|아이/, voice: "가족 단위 방문·상담을 고려한 안내" },
  { match: /브런치|커피|디저트/, voice: "메뉴·공간을 오래 머물기 기준으로 고르는 타입" },
];

export const SOURCE_CITATION_BANS = [
  "검색 결과에 따르면",
  "네이버 기준",
  "구글 기준",
  "기사에 따르면",
  "리뷰에 따르면",
  "홈페이지에",
  "공식 블로그에",
  "조사 결과",
  "검색해보니",
];

export function reinterpretSignal(signal) {
  const s = String(signal || "").trim();
  if (!s || s.length < 2) return null;
  for (const { match, voice } of SIGNAL_TO_VOICE) {
    if (match.test(s)) return voice;
  }
  if (s.length > 48) return null;
  return `${s} — 입력·공개 맥락을 바탕으로 한 운영 포인트`;
}

export function reinterpretSignals(signals = []) {
  const voices = [];
  const seen = new Set();
  for (const sig of signals) {
    const v = reinterpretSignal(sig);
    if (v && !seen.has(v)) {
      seen.add(v);
      voices.push(v);
    }
  }
  return voices;
}

export function stripSourceCitations(text) {
  let t = String(text || "");
  for (const ban of SOURCE_CITATION_BANS) {
    t = t.replace(new RegExp(ban, "gi"), "");
  }
  return t.replace(/\s{2,}/g, " ").trim();
}

export function mergeUserOverSearch(userFacts, searchVoices) {
  const userSet = new Set(userFacts.filter(Boolean));
  const merged = [...userSet];
  for (const v of searchVoices) {
    if (!merged.some((u) => u.includes(v.slice(0, 8)) || v.includes(u.slice(0, 8)))) {
      merged.push(v);
    }
  }
  return merged.slice(0, 12);
}
