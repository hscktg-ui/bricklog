/**
 * AI 상세페이지 툴 개발자 50인.
 * 디자이너 30인은 출고 감. 여기는 텍스트 비율·폰트 스케일·몰 흐름.
 */
import { DETAIL_PAGE_MALL_SEQUENCE } from "@/lib/product/detailPageRankingPlaybook";

export const DETAIL_PAGE_AI_DEV_PANEL_VERSION = "detail-ai-dev-50-v1";
export const DETAIL_PAGE_AI_DEV_HIRE = 88;

/** @typedef {"textRatio"|"type"|"flow"|"overlay"|"rhythm"|"stack"} AiDevAxis */

/**
 * @typedef {object} DetailPageAiDev
 * @property {string} id
 * @property {string} name
 * @property {string} title
 * @property {string} tool
 * @property {AiDevAxis} lens
 * @property {Partial<Record<AiDevAxis, number>>} weights
 */

/** @type {DetailPageAiDev[]} */
export const DETAIL_PAGE_AI_DEV_PANEL_50 = [
  { id: "a01", name: "김하린", title: "860 캔버스 엔진", tool: "내부 렌더러", lens: "stack", weights: { stack: 0.4, textRatio: 0.25, rhythm: 0.2, type: 0.15 } },
  { id: "a02", name: "이준혁", title: "텍스트/이미지 비율", tool: "크리에이지형", lens: "textRatio", weights: { textRatio: 0.5, overlay: 0.25, rhythm: 0.15, stack: 0.1 } },
  { id: "a03", name: "박소은", title: "타이포 스케일 리드", tool: "타이포 OS", lens: "type", weights: { type: 0.5, rhythm: 0.25, overlay: 0.15, stack: 0.1 } },
  { id: "a04", name: "최민재", title: "몰 9칸 플로우", tool: "후커블형", lens: "flow", weights: { flow: 0.5, overlay: 0.2, stack: 0.2, textRatio: 0.1 } },
  { id: "a05", name: "정예원", title: "오버레이 엔지니어", tool: "드랩형", lens: "overlay", weights: { overlay: 0.45, textRatio: 0.25, type: 0.2, rhythm: 0.1 } },
  { id: "a06", name: "한도윤", title: "컷 리듬 컴포저", tool: "젠시형", lens: "rhythm", weights: { rhythm: 0.45, textRatio: 0.25, stack: 0.2, type: 0.1 } },
  { id: "a07", name: "오시윤", title: "양곡 글꼴 라우터", tool: "카테고리 페어", lens: "type", weights: { type: 0.4, flow: 0.25, overlay: 0.2, stack: 0.15 } },
  { id: "a08", name: "윤지호", title: "카페 글꼴 라우터", tool: "카테고리 페어", lens: "type", weights: { type: 0.4, flow: 0.25, overlay: 0.2, stack: 0.15 } },
  { id: "a09", name: "서지안", title: "후킹 정보밀도", tool: "네이버 쇼핑 랭킹", lens: "flow", weights: { flow: 0.4, overlay: 0.3, textRatio: 0.2, type: 0.1 } },
  { id: "a10", name: "배하늘", title: "나열 칸 타이포", tool: "리스트 PNG", lens: "overlay", weights: { overlay: 0.35, textRatio: 0.3, type: 0.2, flow: 0.15 } },
  { id: "a11", name: "문태리", title: "스펙 숫자 위계", tool: "가격 필드", lens: "type", weights: { type: 0.35, overlay: 0.3, rhythm: 0.2, stack: 0.15 } },
  { id: "a12", name: "조은호", title: "배송·고시 분리", tool: "몰 필수정보", lens: "flow", weights: { flow: 0.45, overlay: 0.25, stack: 0.2, textRatio: 0.1 } },
  { id: "a13", name: "신유나", title: "이미지커버 게이트", tool: "컷 생성기", lens: "textRatio", weights: { textRatio: 0.5, rhythm: 0.2, stack: 0.2, overlay: 0.1 } },
  { id: "a14", name: "권도하", title: "자간·트래킹 가드", tool: "한글 타이포", lens: "type", weights: { type: 0.55, overlay: 0.2, rhythm: 0.15, stack: 0.1 } },
  { id: "a15", name: "임하율", title: "웨이트 절제", tool: "한글 타이포", lens: "type", weights: { type: 0.5, rhythm: 0.25, overlay: 0.15, stack: 0.1 } },
  { id: "a16", name: "강시아", title: "첫눈 3초 스캔", tool: "시선 시뮬", lens: "overlay", weights: { overlay: 0.4, flow: 0.3, textRatio: 0.2, type: 0.1 } },
  { id: "a17", name: "노재민", title: "웹UI 오염 헌터", tool: "가드", lens: "stack", weights: { stack: 0.5, textRatio: 0.2, type: 0.15, rhythm: 0.15 } },
  { id: "a18", name: "황보람", title: "통이미지 스택", tool: "스마트스토어 붙이기", lens: "stack", weights: { stack: 0.45, flow: 0.25, rhythm: 0.2, textRatio: 0.1 } },
  { id: "a19", name: "유지환", title: "쿠팡 860 포맷", tool: "쿠팡윙", lens: "stack", weights: { stack: 0.45, flow: 0.25, overlay: 0.2, type: 0.1 } },
  { id: "a20", name: "손예린", title: "히어로 vs 정보 크기", tool: "스케일 충돌", lens: "rhythm", weights: { rhythm: 0.5, type: 0.25, overlay: 0.15, textRatio: 0.1 } },
  { id: "a21", name: "차준서", title: "매크로 컷 글자량", tool: "재료 칸", lens: "textRatio", weights: { textRatio: 0.45, overlay: 0.3, rhythm: 0.15, type: 0.1 } },
  { id: "a22", name: "구민서", title: "패키지 실물 우선", tool: "포토 슬롯", lens: "textRatio", weights: { textRatio: 0.4, stack: 0.25, flow: 0.2, overlay: 0.15 } },
  { id: "a23", name: "라현우", title: "원두 맛축 나열", tool: "카페 PDP", lens: "flow", weights: { flow: 0.4, overlay: 0.3, type: 0.2, textRatio: 0.1 } },
  { id: "a24", name: "표다은", title: "쌀 속성 나열", tool: "양곡 PDP", lens: "flow", weights: { flow: 0.4, overlay: 0.3, type: 0.2, textRatio: 0.1 } },
  { id: "a25", name: "하도경", title: "줄바꿈 keep-all", tool: "한글 엔진", lens: "type", weights: { type: 0.45, overlay: 0.3, rhythm: 0.15, stack: 0.1 } },
  { id: "a26", name: "엄시후", title: "11em 박스 한줄", tool: "오버레이 박스", lens: "overlay", weights: { overlay: 0.45, type: 0.3, textRatio: 0.15, rhythm: 0.1 } },
  { id: "a27", name: "공나영", title: "키커 13px 리듬", tool: "위계", lens: "overlay", weights: { overlay: 0.4, type: 0.3, rhythm: 0.2, stack: 0.1 } },
  { id: "a28", name: "석진우", title: "나열 28px vs 사진", tool: "리스트 칸", lens: "textRatio", weights: { textRatio: 0.45, overlay: 0.3, type: 0.15, flow: 0.1 } },
  { id: "a29", name: "전보라", title: "스펙 38px 숫자", tool: "프라이스 필드", lens: "type", weights: { type: 0.4, overlay: 0.25, rhythm: 0.2, stack: 0.15 } },
  { id: "a30", name: "마승현", title: "감성카피 필터", tool: "랭킹 대조", lens: "flow", weights: { flow: 0.5, overlay: 0.25, type: 0.15, textRatio: 0.1 } },
  { id: "a31", name: "변지우", title: "사진 속 한글 금지", tool: "이미지 모델", lens: "stack", weights: { stack: 0.4, textRatio: 0.3, overlay: 0.2, type: 0.1 } },
  { id: "a32", name: "허은재", title: "구성 uniqueness", tool: "스토리보드", lens: "rhythm", weights: { rhythm: 0.45, stack: 0.25, textRatio: 0.2, type: 0.1 } },
  { id: "a33", name: "남소희", title: "정보칸 반복 제목", tool: "카피 위계", lens: "flow", weights: { flow: 0.35, overlay: 0.35, type: 0.2, rhythm: 0.1 } },
  { id: "a34", name: "도하진", title: "배송 칸 텍스트벽", tool: "고시 필드", lens: "textRatio", weights: { textRatio: 0.4, overlay: 0.3, flow: 0.2, type: 0.1 } },
  { id: "a35", name: "류가온", title: "폰트 페어 라이선스", tool: "웹폰트", lens: "type", weights: { type: 0.5, stack: 0.25, overlay: 0.15, rhythm: 0.1 } },
  { id: "a36", name: "진서율", title: "Pretendard 남용", tool: "글리프 폴백", lens: "type", weights: { type: 0.5, overlay: 0.2, stack: 0.2, rhythm: 0.1 } },
  { id: "a37", name: "추이안", title: "모바일 엄지 스크롤", tool: "390 시뮬", lens: "rhythm", weights: { rhythm: 0.35, flow: 0.3, textRatio: 0.2, overlay: 0.15 } },
  { id: "a38", name: "길하음", title: "컷 역할 중복", tool: "포토 디렉션", lens: "rhythm", weights: { rhythm: 0.4, textRatio: 0.25, stack: 0.2, flow: 0.15 } },
  { id: "a39", name: "방태윤", title: "CTA 강도", tool: "출고 가드", lens: "flow", weights: { flow: 0.35, stack: 0.3, overlay: 0.2, type: 0.15 } },
  { id: "a40", name: "설보라", title: "필수정보 마지막", tool: "몰 컴플라이언스", lens: "flow", weights: { flow: 0.5, overlay: 0.2, stack: 0.2, type: 0.1 } },
  { id: "a41", name: "음재희", title: "히어로 하단 여백", tool: "타입 슬롯", lens: "textRatio", weights: { textRatio: 0.45, overlay: 0.3, type: 0.15, rhythm: 0.1 } },
  { id: "a42", name: "피도윤", title: "동일 46px 충돌", tool: "스케일 린터", lens: "rhythm", weights: { rhythm: 0.5, type: 0.3, overlay: 0.15, stack: 0.05 } },
  { id: "a43", name: "하린아", title: "본문 18px 리드", tool: "위계", lens: "overlay", weights: { overlay: 0.4, type: 0.3, flow: 0.2, textRatio: 0.1 } },
  { id: "a44", name: "계성민", title: "섹션 PNG 높이", tool: "스택 익스포트", lens: "stack", weights: { stack: 0.4, rhythm: 0.3, textRatio: 0.2, type: 0.1 } },
  { id: "a45", name: "두아영", title: "원두 분쇄 옵션 위치", tool: "카페 플로우", lens: "flow", weights: { flow: 0.45, overlay: 0.25, type: 0.2, textRatio: 0.1 } },
  { id: "a46", name: "라온솔", title: "쌀 1포·연도", tool: "양곡 플로우", lens: "flow", weights: { flow: 0.45, overlay: 0.25, type: 0.2, textRatio: 0.1 } },
  { id: "a47", name: "모하준", title: "이미지모델 vs HTML글자", tool: "Planned Gen", lens: "stack", weights: { stack: 0.4, textRatio: 0.3, overlay: 0.2, type: 0.1 } },
  { id: "a48", name: "빈서진", title: "구성 회전 테이블", tool: "제네릭 스토리", lens: "rhythm", weights: { rhythm: 0.4, stack: 0.25, flow: 0.2, type: 0.15 } },
  { id: "a49", name: "사공윤", title: "출고 전 툴 QA", tool: "내부 게이트", lens: "stack", weights: { stack: 0.3, type: 0.25, flow: 0.2, textRatio: 0.15, overlay: 0.1 } },
  { id: "a50", name: "장예림", title: "최종 아트 디렉터", tool: "출고", lens: "overlay", weights: { overlay: 0.25, flow: 0.25, type: 0.2, textRatio: 0.15, rhythm: 0.15 } },
];

function clamp(n, lo = 0, hi = 99) {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function hashDrift(id) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 97;
  return (h % 5) - 2;
}

function count(html, re) {
  return (String(html || "").match(re) || []).length;
}

function beatsOf(html) {
  return [...String(html || "").matchAll(/data-mall-beat="([^"]+)"/g)].map((m) => m[1]);
}

function coveragesOf(html) {
  return [...String(html || "").matchAll(/data-image-coverage="([\d.]+)"/g)].map((m) => Number(m[1]));
}

function firstHeadline(html) {
  const m = String(html || "").match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return String(m?.[1] || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function measureDetailPageForAiDevs(pack = {}, html = "") {
  const source = String(html || "");
  const beats = beatsOf(source);
  const want = DETAIL_PAGE_MALL_SEQUENCE.map((s) => s.beat);
  const flowExact = beats.length === want.length && want.every((b, i) => beats[i] === b);
  const coverages = coveragesOf(source);
  const meanCov = coverages.length
    ? coverages.reduce((a, b) => a + b, 0) / coverages.length
    : 0;
  const xl = count(source, /font-size:46px/g);
  const sizeHits = [...source.matchAll(/font-size:(\d+)px/g)].map((m) => Number(m[1]));
  const uniqueSizes = new Set(sizeHits.filter((n) => n >= 17)).size;
  const listLines = count(source, /data-role="list-line"/g);
  const h1 = firstHeadline(source);
  const h1Chars = h1.replace(/\s/g, "").length;
  const attributeHook = /10kg|200g|햅쌀|도정|진상|로스팅|분쇄|당일/.test(h1);
  const lyricHook = /온기|내려야|향이 번|밥맛은 다릅니다|향은/.test(h1);
  const groceryType = /Nanum Myeongjo/.test(source);
  const cafeType = /Gowun Batang/.test(source);
  const pretendardLead = /font-family:'Pretendard/.test(source);
  const tightTrack = /letter-spacing:-0\.0[2-4]em/.test(source);
  const titleTrackZero = /font-size:46px;line-height:1.28;letter-spacing:0/.test(source);
  const weight700Head = /font-size:46px[^"]*font-weight:700/.test(source);
  const keepAll = source.includes("word-break:keep-all");
  const listingCov = (() => {
    const block = source.match(/data-mall-beat="listing"[\s\S]{0,400}data-image-coverage="([\d.]+)"/);
    return block ? Number(block[1]) : 0;
  })();
  const specPx = /data-mall-beat="spec"[\s\S]{0,1200}font-size:38px/.test(source);
  const webUi = /<button|<nav|border-radius:999px/.test(source);
  const hardCta = /지금 바로 구매|바로 담기/.test(source);

  const stack = clamp(
    (source.includes('data-renderer="detail-canvas"') ? 28 : 4) +
      (source.includes("860px") ? 22 : 0) +
      (source.includes('data-deliverable="canvas"') || source.includes('data-deliverable="mall-image"') ? 16 : 4) +
      (webUi ? 0 : 18) +
      (hardCta ? 0 : 12) +
      (source.includes("data-korean-in-image=\"0\"") ? 6 : 2)
  );

  const textRatio = clamp(
    (meanCov >= 0.72 && meanCov <= 0.86 ? 28 : meanCov >= 0.6 ? 16 : 8) +
      (listingCov > 0 && listingCov <= 0.62 ? 22 : listingCov > 0.8 && listLines >= 5 ? 4 : 12) +
      (xl <= 1 ? 18 : xl === 2 ? 8 : 2) +
      (h1Chars >= 6 && h1Chars <= 16 ? 16 : h1Chars <= 22 ? 8 : 2) +
      (count(source, /data-role="kicker"/g) >= 4 ? 10 : 4)
  );

  const type = clamp(
    ((groceryType && /Fraunces/.test(source)) || (cafeType && /Fraunces/.test(source)) ? 24 : 6) +
      (keepAll ? 14 : 4) +
      (uniqueSizes >= 5 ? 20 : uniqueSizes >= 4 ? 12 : 6) +
      (titleTrackZero ? 4 : 12) +
      (tightTrack ? 0 : 10) +
      (weight700Head ? 0 : 12) +
      (pretendardLead ? 2 : 8) +
      (specPx ? 8 : 4)
  );

  const flow = clamp(
    (flowExact ? 36 : beats[0] === "hook" ? 12 : 4) +
      (attributeHook ? 28 : lyricHook ? 6 : 12) +
      (/산지|품종|원산지|로스팅/.test(source) ? 14 : 4) +
      (/단순 변심|개봉/.test(source) ? 12 : 4) +
      (hardCta ? 0 : 10)
  );

  const overlay = clamp(
    (count(source, /data-role="kicker"/g) >= 3 ? 18 : 6) +
      (h1Chars > 0 && h1Chars <= 18 ? 20 : 8) +
      (attributeHook ? 22 : 8) +
      (/max-width:11em/.test(source) && h1Chars > 18 ? 4 : 16) +
      (count(source, /data-role="lead"/g) <= 2 ? 12 : 6) +
      (listLines >= 4 && listLines <= 7 ? 12 : listLines > 8 ? 4 : 8)
  );

  const rhythm = clamp(
    (uniqueSizes >= 5 ? 24 : uniqueSizes >= 4 ? 14 : 6) +
      (xl <= 1 ? 22 : xl === 2 ? 10 : 2) +
      (new Set(beats).size >= 8 ? 18 : 8) +
      (count(source, /data-composition="/g) >= 8 ? 16 : 8) +
      (listingCov > 0.8 && xl >= 2 ? 0 : 12)
  );

  return {
    beats,
    flowExact,
    coverages,
    meanCov: Math.round(meanCov * 100) / 100,
    listingCov,
    listLines,
    xl,
    uniqueSizes,
    h1,
    h1Chars,
    attributeHook,
    lyricHook,
    groceryType,
    cafeType,
    specPx,
    textRatio,
    type,
    flow,
    overlay,
    rhythm,
    stack,
  };
}

function axisNote(dev, m) {
  if (dev.lens === "textRatio" && m.textRatio < 80) {
    if (m.listingCov > 0.8 && m.listLines >= 5) {
      return `나열 칸 커버 ${m.listingCov}에 리스트 ${m.listLines}줄. 사진이 글자 배경이 됩니다.`;
    }
    if (m.xl >= 2) return `XL 46px가 ${m.xl}칸. 사진 비율이 아니라 구호가 반복됩니다.`;
    return "컷마다 글자량이 비슷합니다. 재료·패키지는 글자를 더 빼야 합니다.";
  }
  if (dev.lens === "type" && m.type < 80) {
    if (m.xl >= 2) return "히어로와 정보 칸이 같은 46px입니다. 스케일이 충돌합니다.";
    if (m.uniqueSizes < 5) return `본문 크기 종류가 ${m.uniqueSizes}개뿐입니다. 위계가 안 갈립니다.`;
    return "페어는 맞는데 자간이 전 칸 0으로 잠겨 있습니다. 카테고리 트래킹이 안 탑니다.";
  }
  if (dev.lens === "flow" && m.flow < 80) {
    if (m.lyricHook && !m.attributeHook) {
      return `후킹 「${m.h1}」은 광고 카피입니다. 10kg·도정·품종이 첫 칸에 없습니다.`;
    }
    if (!m.flowExact) return `몰 9칸 순서가 ${m.beats.join(">") || "없음"}입니다.`;
    return "흐름 뼈대는 있는데 정보 칸이 상품명을 한 번 더 외칩니다.";
  }
  if (dev.lens === "overlay" && m.overlay < 80) {
    if (m.h1Chars > 18) return `후킹 ${m.h1Chars}자 / max-width 11em. 한글이 세 줄로 접힙니다.`;
    return "키커는 있는데 헤드라인이 고르는 값이 아닙니다.";
  }
  if (dev.lens === "rhythm" && m.rhythm < 80) {
    return `46px ${m.xl}회 · 크기 ${m.uniqueSizes}종. 스크롤해도 같은 소리입니다.`;
  }
  if (dev.lens === "stack" && m.stack < 85) {
    return "860 캔버스 형식은 맞습니다. 글자 스케일이 툴처럼 안 보입니다.";
  }
  if (m.attributeHook && m.flowExact && m.xl <= 1) {
    return "비율·흐름·첫 칸 속성이 맞습니다. 이 점은 툴 출고선입니다.";
  }
  return "형식은 몰 상세입니다. 첫 칸 속성과 크기 위계만 고치면 됩니다.";
}

function scoreDev(dev, measured) {
  let sum = 0;
  let wsum = 0;
  for (const [axis, w] of Object.entries(dev.weights || {})) {
    const v = Number(measured[axis]);
    if (!Number.isFinite(v) || !w) continue;
    sum += v * w;
    wsum += w;
  }
  const base = wsum > 0 ? sum / wsum : 50;
  return clamp(base + hashDrift(dev.id));
}

export function evaluateDetailPageAiDevPanel({ pack, html } = {}) {
  const measured = measureDetailPageForAiDevs(pack, html);
  const votes = DETAIL_PAGE_AI_DEV_PANEL_50.map((d) => {
    const score = scoreDev(d, measured);
    return {
      id: d.id,
      name: d.name,
      title: d.title,
      tool: d.tool,
      lens: d.lens,
      score,
      pass: score >= DETAIL_PAGE_AI_DEV_HIRE,
      note: axisNote(d, measured),
    };
  });
  const scores = votes.map((v) => v.score).sort((a, b) => a - b);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const issues = [];
  if (measured.lyricHook && !measured.attributeHook) issues.push("후킹이 속성 나열이 아님");
  if (measured.xl >= 2) issues.push(`XL 46px ${measured.xl}칸 충돌`);
  if (measured.listingCov > 0.8 && measured.listLines >= 5) issues.push("나열 칸 글자가 사진을 덮음");
  if (measured.h1Chars > 18) issues.push("후킹이 11em에서 접힘");
  if (measured.uniqueSizes < 5) issues.push("폰트 크기 위계 부족");
  if (!measured.flowExact) issues.push("몰 9칸 순서");
  const hire = mean >= DETAIL_PAGE_AI_DEV_HIRE && issues.length === 0;
  return {
    version: DETAIL_PAGE_AI_DEV_PANEL_VERSION,
    measured,
    votes,
    summary: {
      n: 50,
      mean: Math.round(mean * 10) / 10,
      median: scores[24],
      passCount: votes.filter((v) => v.pass).length,
      failCount: votes.filter((v) => !v.pass).length,
      hire,
      hireLabel: hire ? "툴 출고" : "엔진 수정",
      topIssues: issues.slice(0, 4),
      lowest: [...votes].sort((a, b) => a.score - b.score).slice(0, 6),
      highest: [...votes].sort((a, b) => b.score - a.score).slice(0, 6),
      byLens: Object.fromEntries(
        ["textRatio", "type", "flow", "overlay", "rhythm", "stack"].map((lens) => {
          const g = votes.filter((v) => v.lens === lens);
          const avg = g.reduce((a, b) => a + b.score, 0) / (g.length || 1);
          return [lens, Math.round(avg * 10) / 10];
        })
      ),
    },
  };
}
