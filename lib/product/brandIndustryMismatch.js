/**
 * 브랜드·주제 ↔ 업종 불일치 감지 (u091 멍멍살롱×숙박 유형 방지)
 */

const SIGNAL_ROWS = [
  {
    id: "pet",
    brandRe: /멍멍|애견|반려|펫|펫푸드|강아지|고양이|도그|캣/i,
    topicRe: /애견|반려|펫|강아지|고양이|미용 예약/i,
    industryRe: /애견|반려|펫|동물|펫샵|애견미용|미용실/i,
    label: "반려·미용",
  },
  {
    id: "lodging",
    brandRe: /펜션|호텔|숙박|모텔|게스트하우스|리조트/i,
    topicRe: /숙소|숙박|펜션|호텔|투숙|객실/i,
    industryRe: /숙박|펜션|호텔|숙소|민박|리조트/i,
    label: "숙박·숙소",
  },
  {
    id: "cafe",
    brandRe: /카페|커피|브루|모카|베이커리|디저트/i,
    topicRe: /브런치|라떼|에스프레소|디저트|원두/i,
    industryRe: /카페|커피|F&B|음료|베이커리/i,
    label: "카페·F&B",
  },
  {
    id: "medical",
    brandRe: /병원|의원|치과|한의원|클리닉|안과|정형|피부과/i,
    topicRe: /진료|검진|시술|상담|치료|통증/i,
    industryRe: /병원|의원|치과|한의원|의료|클리닉|피부/i,
    label: "의료·클리닉",
  },
  {
    id: "flower",
    brandRe: /꽃|플라워|화환|플랜트/i,
    topicRe: /꽃다발|화환|플랜트|꽃집|배달/i,
    industryRe: /꽃|플라워|화환/i,
    label: "꽃집·플라워",
  },
  {
    id: "academy",
    brandRe: /학원|교육|과외|어학/i,
    topicRe: /수업|강의|특강|입시|학습/i,
    industryRe: /학원|교육|과외|어학/i,
    label: "학원·교육",
  },
  {
    id: "marketing",
    brandRe: /기획|마케팅|광고|대행|에이전시|미디어/i,
    topicRe: /마케팅|광고|홍보|바이럴|채널|블로그 마케팅/i,
    industryRe: /마케팅|광고|홍보|대행|에이전시|미디어/i,
    label: "마케팅·광고",
  },
  {
    id: "fitness",
    brandRe: /헬스|피트니스|요가|필라테스|PT|짐/i,
    topicRe: /운동|헬스|요가|필라테스|체험/i,
    industryRe: /헬스|피트니스|요가|운동|필라테스/i,
    label: "피트니스·운동",
  },
  {
    id: "restaurant",
    brandRe: /식당|맛집|레스토랑|푸드|주방|한옥마을/i,
    topicRe: /메뉴|코스|식사|맛집|예약/i,
    industryRe: /음식점|식당|레스토랑|맛집|푸드/i,
    label: "음식점",
  },
];

function inferSignals(blob = "") {
  const hits = [];
  for (const row of SIGNAL_ROWS) {
    if (row.brandRe.test(blob) || row.topicRe.test(blob)) {
      hits.push(row);
    }
  }
  return hits;
}

function industryMatches(row, industry = "") {
  const ind = String(industry || "").trim();
  if (!ind) return true;
  return row.industryRe.test(ind);
}

/**
 * @param {object} values — brandName, topic, mainKeyword, industry
 * @returns {{ mismatch: boolean, message?: string, hints?: string[], signalIds?: string[] }}
 */
export function detectBrandIndustryMismatch(values = {}) {
  const brand = String(values.brandName || "").trim();
  const topic = String(values.topic || "").trim();
  const main = String(values.mainKeyword || "").trim();
  const industry = String(values.industry || "").trim();
  const blob = `${brand} ${topic} ${main}`.trim();

  if (!brand || blob.length < 3) {
    return { mismatch: false };
  }

  const contentSignals = inferSignals(blob);
  if (!contentSignals.length) {
    return { mismatch: false };
  }

  if (!industry) {
    const top = contentSignals[0];
    return {
      mismatch: true,
      signalIds: contentSignals.map((s) => s.id),
      message: `「${brand}」은 ${top.label} 쪽으로 보이는데 업종이 비어 있어요. 업종을 맞춰 주시면 글 톤이 더 자연스러워져요.`,
      hints: contentSignals.map((s) => s.label),
    };
  }

  const conflicting = contentSignals.filter((s) => !industryMatches(s, industry));
  if (!conflicting.length) {
    return { mismatch: false };
  }

  const primary = conflicting[0];
  const looksLike = primary.label;
  return {
    mismatch: true,
    signalIds: conflicting.map((s) => s.id),
    message: `「${brand}」·주제는 ${looksLike}에 가깝게 보이는데, 업종이 「${industry}」로 되어 있어요. 업종을 맞추거나 브랜드·주제를 다시 확인해 주세요.`,
    hints: conflicting.map((s) => s.label),
  };
}
