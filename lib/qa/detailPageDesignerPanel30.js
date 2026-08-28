/**
 * 브릭로그 상세 결과물 — 스마트스토어·쿠팡 상세 디자이너 30인 패널
 * 점수는 화면(HTML)·카피에서 잰 축에 역할 가중치를 곱한 값. 취향 난수는 ±2.
 */
import { flattenDetailPageText } from "@/lib/product/detailPageGrade";

export const DETAIL_PAGE_DESIGNER_PANEL_VERSION = "gollaboda-designer-30-v1";

/** @typedef {"hierarchy"|"type"|"photo"|"intent"|"uniqueness"|"trust"|"cta"|"commercial"|"density"|"color"} DesignerAxis */

/**
 * @typedef {object} DetailPageDesigner
 * @property {string} id
 * @property {string} name
 * @property {string} title
 * @property {string} studio
 * @property {string} lens
 * @property {Partial<Record<DesignerAxis, number>>} weights
 */

/** @type {DetailPageDesigner[]} */
export const DETAIL_PAGE_DESIGNER_PANEL_30 = [
  { id: "d01", name: "한지민", title: "롱페이지 아트디렉터", studio: "스토어 PDP", lens: "hierarchy", weights: { hierarchy: 0.4, commercial: 0.25, type: 0.2, photo: 0.15 } },
  { id: "d02", name: "서태훈", title: "쿠팡 리스팅 디자이너", studio: "오픈마켓", lens: "commercial", weights: { commercial: 0.35, hierarchy: 0.25, cta: 0.2, density: 0.2 } },
  { id: "d03", name: "노은채", title: "타이포 디렉터", studio: "편집 디자인", lens: "type", weights: { type: 0.45, hierarchy: 0.25, uniqueness: 0.15, density: 0.15 } },
  { id: "d04", name: "백승우", title: "상품 포토 시퀀스", studio: "이커머스 스튜디오", lens: "photo", weights: { photo: 0.5, hierarchy: 0.2, commercial: 0.2, intent: 0.1 } },
  { id: "d05", name: "문가람", title: "이커머스 UX 라이터", studio: "카피·UX", lens: "intent", weights: { intent: 0.4, uniqueness: 0.25, trust: 0.2, cta: 0.15 } },
  { id: "d06", name: "최도윤", title: "스마트스토어 상세 리드", studio: "네이버 커머스", lens: "commercial", weights: { commercial: 0.3, type: 0.2, density: 0.25, cta: 0.25 } },
  { id: "d07", name: "임소율", title: "컬러·포인트 디자이너", studio: "브랜드 비주얼", lens: "color", weights: { color: 0.4, type: 0.25, hierarchy: 0.2, photo: 0.15 } },
  { id: "d08", name: "강도현", title: "스펙·표 정보설계", studio: "리테일 UX", lens: "density", weights: { density: 0.35, uniqueness: 0.25, trust: 0.2, commercial: 0.2 } },
  { id: "d09", name: "윤채원", title: "스크롤 리듬 에디터", studio: "모바일 커머스", lens: "hierarchy", weights: { hierarchy: 0.3, photo: 0.25, uniqueness: 0.25, density: 0.2 } },
  { id: "d10", name: "박시온", title: "신뢰·과장 검수 디자이너", studio: "컴플라이언스 비주얼", lens: "trust", weights: { trust: 0.45, cta: 0.25, uniqueness: 0.15, intent: 0.15 } },
  { id: "d11", name: "오하린", title: "히어로 퍼스트스크린", studio: "전환 디자인", lens: "hierarchy", weights: { hierarchy: 0.4, photo: 0.3, type: 0.2, cta: 0.1 } },
  { id: "d12", name: "정우석", title: "860px 템플릿 엔지니어", studio: "스토어 HTML", lens: "commercial", weights: { commercial: 0.45, type: 0.3, density: 0.15, color: 0.1 } },
  { id: "d13", name: "신예린", title: "하이라이트 칩 디자이너", studio: "UI 키트", lens: "color", weights: { color: 0.3, hierarchy: 0.25, uniqueness: 0.25, type: 0.2 } },
  { id: "d14", name: "유민재", title: "F&B 패키지 상세", studio: "식품 PDP", lens: "intent", weights: { intent: 0.35, photo: 0.25, trust: 0.2, uniqueness: 0.2 } },
  { id: "d15", name: "배서현", title: "약한 CTA 디자이너", studio: "브랜드 커머스", lens: "cta", weights: { cta: 0.4, trust: 0.3, intent: 0.2, commercial: 0.1 } },
  { id: "d16", name: "조하준", title: "반복 문장 헌터", studio: "편집 검수", lens: "uniqueness", weights: { uniqueness: 0.5, density: 0.2, intent: 0.15, type: 0.15 } },
  { id: "d17", name: "권지아", title: "모바일 엄지 스크롤", studio: "앱 커머스", lens: "photo", weights: { photo: 0.3, hierarchy: 0.3, commercial: 0.25, uniqueness: 0.15 } },
  { id: "d18", name: "황태경", title: "쿠팡 윙 상세 디자이너", studio: "오픈마켓 대행", lens: "density", weights: { density: 0.3, commercial: 0.3, uniqueness: 0.25, cta: 0.15 } },
  { id: "d19", name: "나지훈", title: "브랜드-상품 분리", studio: "브랜드 스튜디오", lens: "intent", weights: { intent: 0.3, uniqueness: 0.3, trust: 0.2, hierarchy: 0.2 } },
  { id: "d20", name: "송은재", title: "여백·섹션 경계", studio: "에디토리얼", lens: "type", weights: { type: 0.35, hierarchy: 0.3, photo: 0.2, color: 0.15 } },
  { id: "d21", name: "마도연", title: "식품 신뢰 레이아웃", studio: "H&B 커머스", lens: "trust", weights: { trust: 0.4, intent: 0.25, photo: 0.2, cta: 0.15 } },
  { id: "d22", name: "구본혁", title: "카드·그리드 모듈", studio: "컴포넌트 디자인", lens: "commercial", weights: { commercial: 0.3, hierarchy: 0.25, uniqueness: 0.25, type: 0.2 } },
  { id: "d23", name: "라수빈", title: "카페·원두 상세", studio: "F&B 비주얼", lens: "photo", weights: { photo: 0.35, color: 0.25, intent: 0.2, uniqueness: 0.2 } },
  { id: "d24", name: "표세린", title: "표·스펙 가독", studio: "정보 디자인", lens: "density", weights: { density: 0.4, type: 0.25, uniqueness: 0.2, trust: 0.15 } },
  { id: "d25", name: "하윤호", title: "전환 vs 신뢰 밸런스", studio: "퍼포먼스 디자인", lens: "cta", weights: { cta: 0.35, trust: 0.3, commercial: 0.2, uniqueness: 0.15 } },
  { id: "d26", name: "진아람", title: "첫 3초 스캔", studio: "시선 추적", lens: "hierarchy", weights: { hierarchy: 0.45, photo: 0.25, type: 0.2, uniqueness: 0.1 } },
  { id: "d27", name: "엄지후", title: "스마트스토어 검수", studio: "셀러 툴", lens: "commercial", weights: { commercial: 0.35, trust: 0.25, density: 0.2, type: 0.2 } },
  { id: "d28", name: "차민서", title: "카피 밀도 vs 숨", studio: "콘텐츠 디자인", lens: "uniqueness", weights: { uniqueness: 0.4, density: 0.3, intent: 0.2, type: 0.1 } },
  { id: "d29", name: "석보람", title: "포인트 컬러 절제", studio: "커머스 UI", lens: "color", weights: { color: 0.4, type: 0.25, hierarchy: 0.2, commercial: 0.15 } },
  { id: "d30", name: "공태민", title: "붙이기 전 최종 아트", studio: "출고 검수", lens: "commercial", weights: { commercial: 0.25, uniqueness: 0.25, trust: 0.2, hierarchy: 0.15, photo: 0.15 } },
];

const PAD_PHRASE = "고르는 순서가 보이면";
const HARD_SELL = /지금 바로 구매|바로 담기|지금 구매|100%|무조건|솔직\s*후기|리뷰\s*\d+|별점/;

function clamp(n, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function hashDrift(id) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 97;
  return (h % 5) - 2;
}

/** @param {object} pack @param {string} [html] @param {number} [photoCount] */
export function measureDetailPageForDesigners(pack, html = "", photoCount = 0) {
  const text = flattenDetailPageText(pack);
  const htmlStr = String(html || "");
  const sections = Array.isArray(pack?.sections) ? pack.sections : [];
  const types = new Set(sections.map((s) => s.type));
  const padHits = (text.match(new RegExp(PAD_PHRASE, "g")) || []).length;
  const sentences = text
    .split(/(?<=다\.|요\.|니다\.)\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 12);
  const freq = new Map();
  for (const s of sentences) freq.set(s, (freq.get(s) || 0) + 1);
  const dupSentences = [...freq.values()].filter((n) => n >= 2).length;
  const headline = String(pack?.headline || "");

  const uniqueness = clamp(100 - padHits * 14 - Math.max(0, dupSentences - 1) * 10);
  const hierarchy = clamp(
    (htmlStr.includes("font-size:38px") ? 28 : 8) +
      (types.has("hero") ? 24 : 0) +
      (headline.length >= 8 && headline.length <= 48 ? 22 : 8) +
      (htmlStr.includes("letter-spacing:0.16em") ? 16 : 6) +
      (padHits > 3 ? -18 : 0)
  );
  const type = clamp(
    (/pretendard|noto serif|noto sans|ibm plex|gowun|hahmlet|song myung|gothic a1|nanum|jua|playfair|fraunces|cormorant|outfit|instrument serif|dm sans|fonts\.googleapis/i.test(
      htmlStr
    )
      ? 30
      : 0) +
      (htmlStr.includes("860px") ? 28 : 0) +
      (htmlStr.includes("word-break:keep-all") ? 22 : 8) +
      (htmlStr.includes("line-height:1.9") ? 16 : 8)
  );
  const slotCount = (htmlStr.match(/data-photo-slot=/g) || []).length;
  const emptyWells = (htmlStr.match(/data-photo-empty="1"/g) || []).length;
  const photo = clamp(
    photoCount >= 3
      ? 78
      : photoCount === 2
        ? 64
        : photoCount === 1
          ? 52
          : emptyWells >= 3 || slotCount >= 3
            ? 62
            : slotCount >= 1
              ? 50
              : 38
  );
  const intent = clamp(
    (types.has("intent") ? 40 : 8) +
      (text.includes("고를") || text.includes("막히") ? 28 : 10) +
      (types.has("explain") ? 18 : 6) +
      (padHits > 4 ? -16 : 0)
  );
  const trust = HARD_SELL.test(text) ? 32 : clamp(86 - Math.min(20, padHits * 3));
  const cta = clamp(
    (types.has("cta") ? 40 : 10) +
      (!/지금 구매|바로 담기/.test(text) ? 30 : 4) +
      (text.includes("서두르") ? 18 : 12)
  );
  const commercial = clamp(
    (htmlStr.includes("860px") ? 34 : 0) +
      (htmlStr.includes("gollaboda-detail-page") ? 18 : 8) +
      (types.has("usp") && types.has("spec") ? 24 : 10) +
      (htmlStr.includes("data-ui=\"section-layouts\"") ? 16 : 8)
  );
  const density = clamp(
    (pack?._meta?.densityOk ? 40 : 18) +
      (sections.length >= 8 ? 22 : 10) +
      (uniqueness >= 70 ? 24 : uniqueness >= 50 ? 12 : 4) +
      (padHits > 3 ? -16 : 0)
  );
  const color = clamp(
    (/#9a3412|#5c4033|#03a94d/.test(htmlStr) ? 36 : 16) +
      (htmlStr.includes("border-radius:999px") ? 22 : 10) +
      (htmlStr.includes("data-highlights") ? 22 : 8) +
      12
  );

  return {
    chars: String(text).replace(/\s/g, "").length,
    sectionCount: sections.length,
    sectionTypes: [...types],
    photoCount,
    slotCount,
    emptyWells,
    padHits,
    dupSentences,
    uniqueness,
    hierarchy,
    type,
    photo,
    intent,
    trust,
    cta,
    commercial,
    density,
    color,
    engineScore: pack?._meta?.sqv?.score ?? null,
    mode: pack?._meta?.mode || null,
  };
}

function emptyWellsNote(m) {
  if (m.slotCount >= 3) {
    return "사진 칸은 잡혀 있습니다. 올린 사진을 넣으면 리듬이 완성됩니다.";
  }
  return "사진이 없으면 860 상세가 아니라 긴 글입니다.";
}

function axisNote(designer, m) {
  const lens = designer.lens;
  if (lens === "uniqueness" && m.uniqueness < 60) {
    return `같은 마침 문장이 ${m.padHits}번 반복됩니다. 롱페이지로 안 읽힙니다.`;
  }
  if (lens === "photo" && m.photoCount < 3) {
    return m.photoCount
      ? `사진 ${m.photoCount}장은 시작이지만, 히어로-설명-막히는 점 3컷이 필요합니다.`
      : emptyWellsNote(m);
  }
  if (lens === "hierarchy" && m.hierarchy < 70) {
    return "첫 화면에서 제목·사진·한 줄 강조가 한 번에 안 붙습니다.";
  }
  if (lens === "type" && m.type >= 75 && m.uniqueness < 60) {
    return "글꼴·자간은 맞는데, 본문이 패딩 문장으로 리듬이 죽습니다.";
  }
  if (lens === "trust" && m.trust >= 80) {
    return "가짜 후기·지금 구매는 없습니다. 이 점은 통과입니다.";
  }
  if (lens === "cta" && m.cta >= 70) {
    return "약한 안내는 맞습니다. 서두르는 버튼은 없습니다.";
  }
  if (lens === "commercial" && m.commercial >= 70 && m.uniqueness < 55) {
    return "860·섹션 모듈은 출고 가능한데, 반복 카피가 붙이면 싼 티가 납니다.";
  }
  if (lens === "density" && m.padHits > 3) {
    return "글자 수는 채워져 있어도, 정보가 늘지 않고 같은 문장만 늘었습니다.";
  }
  if (lens === "color" && m.color >= 70) {
    return "포인트 색·칩은 절제되어 있습니다. 본문 반복만 빼면 됩니다.";
  }
  if (lens === "intent" && m.intent >= 70) {
    return "막히는 점 칸은 있습니다. 그 다음 문장이 같은 말로 밀립니다.";
  }
  if (m.uniqueness < 55) {
    return "화면 뼈대는 있는데, 문장 반복이 상세 품질을 깎습니다.";
  }
  if (m.photoCount < 3) {
    return "카피 구조는 보이지만 사진 리듬이 없어 시안이 덜 찹니다.";
  }
  return "붙일 뼈대는 됩니다. 반복만 걷어내면 출고 직전입니다.";
}

function designerScore(designer, measured) {
  let sum = 0;
  let wsum = 0;
  for (const [axis, w] of Object.entries(designer.weights || {})) {
    const v = Number(measured[axis]);
    if (!Number.isFinite(v) || !w) continue;
    sum += v * w;
    wsum += w;
  }
  const base = wsum > 0 ? sum / wsum : 50;
  return clamp(base + hashDrift(designer.id));
}

/**
 * @param {{ pack: object, html?: string, photoCount?: number }} input
 */
export function evaluateDetailPageDesignerPanel(input) {
  const pack = input?.pack || {};
  const html = String(input?.html || "");
  const photoCount = Number(input?.photoCount || 0);
  const measured = measureDetailPageForDesigners(pack, html, photoCount);
  const votes = DETAIL_PAGE_DESIGNER_PANEL_30.map((d) => {
    const score = designerScore(d, measured);
    return {
      id: d.id,
      name: d.name,
      title: d.title,
      studio: d.studio,
      lens: d.lens,
      score,
      pass: score >= 70,
      note: axisNote(d, measured),
    };
  });
  const scores = votes.map((v) => v.score).sort((a, b) => a - b);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const median = scores[Math.floor(scores.length / 2)];
  const passCount = votes.filter((v) => v.pass).length;
  const issues = [];
  if (measured.uniqueness < 60) issues.push("같은 마침 문장 반복");
  if (measured.photoCount < 3) issues.push("사진 리듬 부족");
  if (measured.hierarchy < 70) issues.push("첫 화면 위계");
  if (measured.density < 60) issues.push("정보 밀도보다 글자 수");
  const hire =
    mean >= 72 && measured.uniqueness >= 58 && measured.commercial >= 70;
  return {
    version: DETAIL_PAGE_DESIGNER_PANEL_VERSION,
    measured,
    votes,
    summary: {
      n: votes.length,
      mean: Math.round(mean * 10) / 10,
      median,
      passCount,
      failCount: votes.length - passCount,
      hire,
      hireLabel: hire ? "출고 가능" : "수정 후 재심",
      topIssues: issues.slice(0, 3),
      lowest: [...votes].sort((a, b) => a.score - b.score).slice(0, 5),
      highest: [...votes].sort((a, b) => b.score - a.score).slice(0, 5),
    },
  };
}
