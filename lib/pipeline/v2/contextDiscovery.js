/**
 * Context Discovery Engine — 입력에 실제로 있는 정보만 추출 (추정·생성 금지)
 */
import { sanitizeText, isJunkValue } from "@/utils/sanitizeInput";
import { resolveSimpleIndustry } from "@/lib/simpleIndustry";
import { resolveBrandIndustryContext } from "@/lib/brand/brandContext";

const INDUSTRY_PHRASES = [
  { re: /광고\s*대행|마케팅\s*대행|퍼포먼스\s*마케팅|브랜딩\s*에이전시/, key: "agency", label: "광고대행사" },
  { re: /무인\s*꽃|무인꽃/, key: "unmanned_flower", label: "무인꽃집" },
  { re: /꽃집|플라워|생화|꽃다발/, key: "flower", label: "꽃집" },
  { re: /카페|커피\s*숍/, key: "cafe", label: "카페" },
  { re: /병원|의원|클리닉/, key: "hospital", label: "병원·의원" },
  { re: /가구|인테리어\s*매장/, key: "furniture", label: "가구·인테리어" },
  { re: /부동산|중개/, key: "realestate", label: "부동산" },
  { re: /학원|교육|입시/, key: "academy", label: "학원·교육" },
  { re: /펫|반려동물|애견/, key: "pet", label: "펫" },
  { re: /세차|카\s*워시|자동차/, key: "carwash", label: "자동차" },
  { re: /음식점|맛집|레스토랑/, key: "restaurant", label: "음식점" },
  { re: /미용실|헤어|네일/, key: "salon", label: "미용실" },
];

const REGION_RE =
  /([가-힣]{2,8}(?:시|구|군|동|읍|면|리|역|로|길)?(?:\s*[가-힣]{2,6})?)/g;

const SEASON_RE = /봄|여름|가을|겨울|장마|초여름|한겨울|시즌/;
const EVENT_RE = /어버이|스승|기념|이벤트|오픈|행사|프로모|가정의달|선물|할인/;

function collectRawFragments(input = {}) {
  const fields = [
    input.topic,
    input.includePhrases,
    input.brandDescription,
    input.storeFeatures,
    input.mainKeyword,
    input.freeform,
    input._rawTopic,
  ];
  return fields
    .filter((f) => f && String(f).trim().length >= 8)
    .map((f) => String(f).trim());
}

function extractRegionFromText(text) {
  if (!text) return null;
  const m = text.match(
    /([가-힣]{2,6}(?:시|구|군)?\s*[가-힣]{2,6}(?:동|역|로)?|[가-힣]{2,8}역|[가-힣]{2,6}동)/
  );
  return m ? sanitizeText(m[0].replace(/\s+/g, " ").trim()) : null;
}

function extractIndustryFromText(text) {
  if (!text) return null;
  for (const row of INDUSTRY_PHRASES) {
    if (row.re.test(text)) return { key: row.key, label: row.label };
  }
  return null;
}

function extractBrandFromText(text) {
  if (!text || text.length < 4) return null;
  const m = text.match(
    /([가-힣A-Za-z0-9][가-힣A-Za-z0-9·&.\s]{1,20}?)(?:은|는|이야|입니다|이에요|예요|야)\s*$/
  );
  if (m) {
    const name = sanitizeText(m[1].replace(/^우리는?\s*/, "").trim());
    if (name && name.length >= 2 && !/광고|대행|꽃집|카페|병원/.test(name)) {
      return name;
    }
  }
  return null;
}

export function discoverContext(input = {}) {
  const blob = [
    input.topic,
    input.includePhrases,
    input.brandDescription,
    input.storeFeatures,
    input.mainKeyword,
    input.freeform,
  ]
    .filter(Boolean)
    .join(" ");

  const fromText = {
    brandName: extractBrandFromText(blob),
    region: extractRegionFromText(blob),
    industry: extractIndustryFromText(blob),
  };

  const structuredBrand = sanitizeText(input.brandName);
  const structuredRegion = sanitizeText(input.region);
  const structuredIndustry = sanitizeText(input.industry || input.industryKey);

  const brandName = structuredBrand || fromText.brandName || null;
  const region = structuredRegion || fromText.region || null;

  let industryKey = null;
  let industryLabel = null;
  const matrixResolved = resolveBrandIndustryContext({
    brandType: input.brandType,
    industry: structuredIndustry,
  });
  if (structuredIndustry || input.brandType) {
    industryKey = matrixResolved.industryKey;
    industryLabel = matrixResolved.industryLabel;
  } else if (fromText.industry) {
    industryKey = fromText.industry.key;
    industryLabel = fromText.industry.label;
  } else {
    industryKey = matrixResolved.industryKey;
    industryLabel = matrixResolved.industryLabel;
  }

  const topic = sanitizeText(input.topic);
  const mainKeyword = sanitizeText(input.mainKeyword || input.main);
  const product = mainKeyword && mainKeyword !== brandName ? mainKeyword : null;
  const service = sanitizeText(input.benefit) || null;
  const event =
    EVENT_RE.test(blob) || /이벤트|행사|오픈/.test(input.purposeType || "")
      ? sanitizeText(
          (input.includePhrases || "").match(EVENT_RE)?.[0] || "행사·기념"
        )
      : null;
  const season = SEASON_RE.test(blob) ? blob.match(SEASON_RE)?.[0] : null;
  const emotion = /감사|기쁨|설렘|부담|편안|따뜻|아쉬/.test(blob)
    ? blob.match(/감사|기쁨|설렘|부담|편안|따뜻|아쉬/)?.[0]
    : null;

  const discovered = {
    brandName,
    region,
    industryKey,
    industryLabel,
    product,
    service,
    event,
    season,
    topic,
    emotion,
    purposeHint: sanitizeText(input.purposeType || input.purpose),
    includePhrases: sanitizeText(input.includePhrases),
    storeFeatures: sanitizeText(input.storeFeatures),
    brandDescription: sanitizeText(
      input.brandDescription || input.storeFeatures
    ),
    benefit: sanitizeText(input.benefit),
    mainKeyword,
  };

  const present = Object.entries(discovered)
    .filter(([, v]) => v && !isJunkValue(v))
    .map(([k]) => k);

  return {
    discovered,
    present,
    rawFragments: collectRawFragments(input),
    hasMinimumSignal:
      present.length >= 1 &&
      (topic || brandName || region || product || industryKey),
  };
}

/** 사용자 원문이 제목·본문에 그대로 복사됐는지 */
export function containsRawInputLeak(text, rawFragments = []) {
  const t = String(text || "");
  for (const raw of rawFragments) {
    if (raw.length < 10) continue;
    if (t.includes(raw)) return { leak: true, fragment: raw.slice(0, 40) };
    const chunk = raw.slice(0, Math.min(24, raw.length));
    if (chunk.length >= 12 && t.includes(chunk)) {
      return { leak: true, fragment: chunk };
    }
  }
  return { leak: false };
}
