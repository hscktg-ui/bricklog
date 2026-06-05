/**
 * 네이버 블로그 1만 건 학습 → 엔진 규칙 (런타임 fs 불필요)
 */
import { koreanObjectParticle } from "@/lib/prompts/engine/textUtils";

export const NAVER_LEARN_GLOBAL = {
  sampleCount: 10000,
  voiceRate: 42.7,
  fieldRate: 16.2,
  checklistRate: 2.7,
  titleGoodRate: 36.3,
  avgTitleLen: 25,
};

export const NAVER_LEARN_BY_CATEGORY = {
  카페: { voiceRate: 73.8, fieldRate: 28.2, checklistRate: 2.9 },
  꽃집: { voiceRate: 45.8, fieldRate: 11.9, checklistRate: 2.9 },
  음식점: { voiceRate: 50.7, fieldRate: 15.5, checklistRate: 2.3 },
  미용실: { voiceRate: 60.7, fieldRate: 18.9, checklistRate: 1.4 },
  학원: { voiceRate: 50.3, fieldRate: 28.7, checklistRate: 2.2 },
  가구점: { voiceRate: 59, fieldRate: 27.4, checklistRate: 0.7 },
  인테리어: { voiceRate: 23.5, fieldRate: 5.1, checklistRate: 10.5 },
  헬스장: { voiceRate: 52.9, fieldRate: 16.7, checklistRate: 2.1 },
  광고대행사: { voiceRate: 34.7, fieldRate: 18.5, checklistRate: 2.3 },
  "온라인 쇼핑몰": { voiceRate: 41.2, fieldRate: 16.5, checklistRate: 2.4 },
  펜션: { voiceRate: 47.4, fieldRate: 10.5, checklistRate: 2.1 },
  공방: { voiceRate: 46.2, fieldRate: 9.6, checklistRate: 0.5 },
  병원: { voiceRate: 43.6, fieldRate: 19.8, checklistRate: 2.2 },
  약국: { voiceRate: 42.4, fieldRate: 25.9, checklistRate: 2.9 },
  법률: { voiceRate: 17.6, fieldRate: 2.1, checklistRate: 5.2 },
  세무: { voiceRate: 27, fieldRate: 6.2, checklistRate: 1 },
  노무: { voiceRate: 30.2, fieldRate: 13, checklistRate: 1.5 },
  부동산: { voiceRate: 35.6, fieldRate: 17.4, checklistRate: 4.2 },
  금융: { voiceRate: 12.5, fieldRate: 2.4, checklistRate: 2.8 },
  보험: { voiceRate: 22.1, fieldRate: 4.7, checklistRate: 1.6 },
  건강기능식품: { voiceRate: 46.3, fieldRate: 16.6, checklistRate: 1 },
};

const INDUSTRY_CAT_RES = [
  [/카페|coffee/i, "카페"],
  [/꽃|flower|플라워/i, "꽃집"],
  [/음식|맛집|restaurant/i, "음식점"],
  [/미용|헤어|네일|barber/i, "미용실"],
  [/학원|교육|academy/i, "학원"],
  [/가구|침대|매트리스|bed|mattress|furniture/i, "가구점"],
  [/인테리어|시공|리모델/i, "인테리어"],
  [/헬스|피트니스|gym|필라테스/i, "헬스장"],
  [/광고|마케팅|대행|agency/i, "광고대행사"],
  [/쇼핑|mall|commerce/i, "온라인 쇼핑몰"],
  [/펜션|숙소|hotel/i, "펜션"],
  [/공방|원데이|클래스/i, "공방"],
  [/병원|의원|clinic|치과|한의/i, "병원"],
  [/약국|pharmacy/i, "약국"],
  [/법률|변호|law/i, "법률"],
  [/세무|tax/i, "세무"],
  [/노무|labor/i, "노무"],
  [/부동산|realty/i, "부동산"],
  [/금융|finance|대출/i, "금융"],
  [/보험|insurance/i, "보험"],
  [/건강기능|health/i, "건강기능식품"],
];

export function resolveNaverLearnCategory(industry = "") {
  const s = String(industry || "").trim();
  for (const [re, cat] of INDUSTRY_CAT_RES) {
    if (re.test(s)) return cat;
  }
  return "기타";
}

export function getNaverCategoryTargets(industry = "") {
  const cat = resolveNaverLearnCategory(industry);
  return (
    NAVER_LEARN_BY_CATEGORY[cat] || {
      voiceRate: NAVER_LEARN_GLOBAL.voiceRate,
      fieldRate: NAVER_LEARN_GLOBAL.fieldRate,
      checklistRate: NAVER_LEARN_GLOBAL.checklistRate,
    }
  );
}

export const NAVER_ENGINE_AVOID = [
  "확인하세요",
  "권합니다",
  "체크리스트",
  "알아보시다 보면",
  "검색하시는 분",
  "소개해 드리",
  "방문·예약 안내",
  "공식·매장 안내 기준",
  "매장 안내 기준",
  "확인할 수 있습니다",
  "확인하시면 됩니다",
  "체험 전 알아둘 것",
  "확인하는 것이 좋습니다",
  "보시길 권합니다",
];

export const NAVER_VOICE_MARKERS = [
  /(?:했|였|봤|갔|왔)어요/,
  /(?:더|같)아요/,
  /거든요/,
  /(?:근데|그래서|사실|요즘|솔직히)/,
  /솔직(?:히)?(?:후기|하게)?/,
  /다녀(?:왔|온)/,
  /직접\s*(?:가|방문|다녀|체험|확인)/,
  /내돈내산/,
  /방문(?:했| 후기)/,
];

export const NAVER_TITLE_MARKERS = /후기|리뷰|솔직|다녀|방문|체험|추천|내돈내산|직접/;

export const NAVER_VOICE_POLISH_PAIRS = [
  [/확인(?:하세요|해\s*주세요|하는\s*것이\s*좋습니다)/g, "확인했어요"],
  [/권(?:합)?니다\.?/g, "추천드려요."],
  [/필요합니다\.?/g, "필요했어요."],
  [/좋습니다\.?/g, "좋았어요."],
  [/바랍니다\.?/g, "바라요."],
  [/하시길\s*바랍니다/g, "해보세요"],
  [/보시길\s*권(?:합)?니다/g, "추천드려요"],
  [/알아보시다\s*보면/g, "알아보다"],
  [/검색(?:하)?시는\s*분/g, "찾는 분"],
  [/소개(?:해\s*드리|합니다)/g, "정리해"],
  [/매장\s*안내\s*기준/g, "매장 안내"],
  [/정리해\s*두세요/g, "정리해 두었어요"],
  [/확인하세요/g, "확인했어요"],
  [/추천(?:드립)?니다/g, "추천드려요"],
];

export function polishNaverBlogVoice(text) {
  let t = String(text || "");
  for (const [re, rep] of NAVER_VOICE_POLISH_PAIRS) {
    t = t.replace(re, rep);
  }
  t = t
    .replace(/당일\s+당일/g, "당일")
    .replace(/당일\s+안내\s+으로/g, "당일 안내로")
    .replace(/소식를/g, "소식을")
    .replace(/할인를/g, "할인을")
    .replace(/전시를\s*체험/g, "전시를 체험")
    .replace(/([가-힣]{2,})를\s*(찾는|검색)/g, "$1을 $2");
  return t.replace(/\s{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

export function scoreNaverVoiceDensity(text) {
  const t = String(text || "");
  if (!t) return 0;
  let hits = 0;
  for (const re of NAVER_VOICE_MARKERS) {
    if (re.test(t)) hits += 1;
  }
  return hits;
}

export function hasNaverTitleShape(title = "") {
  const t = String(title || "").trim();
  if (!t) return false;
  if (NAVER_TITLE_MARKERS.test(t)) return true;
  return t.replace(/\s/g, "").length <= NAVER_LEARN_GLOBAL.avgTitleLen + 18;
}

export function buildNaverLearnedTitleCandidates(ctx = {}, input = {}) {
  const region = String(ctx.region || input.region || "").trim();
  const brand = String(ctx.brandName || input.brandName || "").trim();
  const topic = String(
    input.topic || input.mainKeyword || ctx.topic || "이용"
  )
    .split(/[,，]/)[0]
    ?.trim();
  const topicObj = koreanObjectParticle(topic);

  const raw = [
    region && brand ? `${region} ${brand} 솔직 후기, ${topic}` : null,
    region && brand ? `${region} ${brand} ${topic} 직접 다녀온 후기` : null,
    region ? `${region} ${topic} 방문 후기 · ${brand}` : null,
    brand && region ? `${brand} ${region} 매장, ${topic} 솔직후기` : null,
    region ? `${region}에서 ${topicObj} 찾다 ${brand} 다녀왔어요` : null,
    brand ? `${brand} ${topic} 내돈내산 후기` : null,
    region && topic ? `${region} ${topic} 추천, ${brand}` : null,
  ]
    .filter(Boolean)
    .map((s) => s.replace(/\s+/g, " ").trim().slice(0, 52));

  return [...new Set(raw)];
}

export function buildNaverEnginePromptAddon(ctx = {}) {
  const industry = String(ctx.industry || ctx.industryLabel || "").trim();
  const targets = getNaverCategoryTargets(industry);
  const cat = resolveNaverLearnCategory(industry);
  const profile = buildNaverVoiceProfileBlock(ctx);
  const fewShot = buildNaverWriterFewShot(ctx);
  return [
    "【네이버 1만 건 학습 · BRICLOG Writer 규칙】",
    `목표 구어체 ~${Math.round(targets.voiceRate)}% (${cat}) · 체크리스트 ${NAVER_LEARN_GLOBAL.checklistRate}% 이하`,
    profile,
    "제목: 지역+브랜드+솔직후기/방문후기 · 25~40자 · 조사「를/을」 정확히",
    `금지: ${NAVER_ENGINE_AVOID.slice(0, 8).join(", ")}`,
    "FAQ·8칸 체크리스트·「확인하세요」 나열 금지 — 칼럼 한 편 흐름",
    fewShot,
  ]
    .filter(Boolean)
    .join("\n");
}

/** 업종별 voice 프로필 — 1만 건 실측 기반 */
const NAVER_VOICE_PROFILES = {
  professional: {
    cats: new Set(["법률", "세무", "노무", "금융", "보험"]),
    brief:
      "톤: 신뢰·설명 중심. 과한 구어·「솔직후기」 남용 금지. 경험·상담 맥락 1~2회.",
    openerHint: "상담·문의 전에 궁금했던 점을 정리해 본 뒤",
  },
  experience: {
    cats: new Set(["카페", "음식점", "미용실", "가구점", "공방", "펜션", "헬스장"]),
    brief:
      "톤: 1인칭 방문·체험·솔직후기. 도입에 「다녀왔어요」「직접」「솔직히」 중 1개 이상.",
    openerHint: "직접 가서 확인해 본 뒤",
  },
  balanced: {
    cats: new Set(["병원", "약국", "학원", "인테리어", "부동산", "광고대행사", "온라인 쇼핑몰", "건강기능식품", "꽃집"]),
    brief:
      "톤: 경험+정보 균형. 「방문해 봤어요」「느낀 점」과 팩트 설명을 섞을 것.",
    openerHint: "방문·이용해 본 뒤 정리해 봤어요",
  },
};

function resolveNaverVoiceProfile(industry = "") {
  const cat = resolveNaverLearnCategory(industry);
  for (const [key, p] of Object.entries(NAVER_VOICE_PROFILES)) {
    if (p.cats.has(cat)) return { key, ...p, cat };
  }
  return { key: "balanced", ...NAVER_VOICE_PROFILES.balanced, cat };
}

export function buildNaverVoiceProfileBlock(ctx = {}) {
  const industry = String(ctx.industry || ctx.industryLabel || "").trim();
  const p = resolveNaverVoiceProfile(industry);
  return `업종(${p.cat}) voice: ${p.brief}`;
}

export function buildNaverWriterFewShot(ctx = {}) {
  const region = String(ctx.region || "").trim() || "○○";
  const brand = String(ctx.brandName || "").trim() || "브랜드";
  const industry = String(ctx.industry || ctx.industryLabel || "").trim();
  const p = resolveNaverVoiceProfile(industry);
  const topic = String(ctx.topic || ctx.mainKeyword || "이용").split(/[,，]/)[0]?.trim();

  if (p.key === "professional") {
    return `예시 도입: ${region} ${brand} ${topic} — ${p.openerHint} 필요한 점만 짧게 정리했어요.`;
  }
  if (p.key === "experience") {
    return `예시 도입: ${region} ${brand} ${p.openerHint} ${topic} 보러 다녀왔어요. 솔직히 첫인상부터 적어 볼게요.`;
  }
  return `예시 도입: ${region} ${brand} ${p.openerHint}. ${topic} 관련해서 현장에서 확인한 점 위주로 적어 봤어요.`;
}

/** Writer regen / Reviewer용 네이버 이슈 */
export function collectNaverWriteIssues(text = "", ctx = {}) {
  const issues = [];
  const t = String(text || "");
  const industry = ctx.industry || ctx.industryLabel || "";
  const targets = getNaverCategoryTargets(industry);
  const minVoice = Math.max(1, Math.round(targets.voiceRate / 40));

  if (scoreNaverVoiceDensity(t) < minVoice) issues.push("naver_voice_low");
  for (const p of NAVER_ENGINE_AVOID) {
    if (p && t.includes(p)) {
      issues.push("naver_avoid_phrase");
      break;
    }
  }
  if (/확인하세요|권합니다|체크리스트로/.test(t)) issues.push("checklist_voice");
  if (/소식를|할인를|전시를\s*체험/.test(t)) issues.push("josa_error");
  return [...new Set(issues)];
}

export const NAVER_REGEN_HINTS = {
  naver_voice_low:
    "네이버 상위글처럼 해요체·1인칭·「솔직히」「다녀왔어요」「직접」을 도입·본문에 자연스럽게 넣으세요. FAQ·나열 금지.",
  naver_avoid_phrase:
    "「확인하세요」「권합니다」「방문·예약 안내」「체험 전 알아둘 것」 등 안내 문서체를 제거하고 경험·칼럼 흐름으로 바꾸세요.",
  checklist_voice:
    "체크리스트·「확인하세요」 나열이 아닌, 문제→이유→비교→정리 칼럼 한 편으로 다시 쓰세요.",
  josa_error:
    "제목·본문 조사(를/을)를 한국어 맞춤법에 맞게 고치세요.",
};

export function buildNaverRegenHintBlock(text = "", ctx = {}) {
  const issues = collectNaverWriteIssues(text, ctx);
  return issues.map((k) => NAVER_REGEN_HINTS[k]).filter(Boolean).join(" ");
}
