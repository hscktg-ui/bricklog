import { getActiveSeasonContext } from "@/lib/season/seasonEngine";
import { getCachedSnapshot } from "@/lib/trends/clientSnapshot";
import { resolveSimpleIndustry } from "@/lib/simpleIndustry";
import { sanitizeText } from "@/utils/sanitizeInput";

function STAR(n) {
  const filled = Math.min(5, Math.max(1, Math.round(n)));
  return "★".repeat(filled) + "☆".repeat(5 - filled);
}

function regionStem(region) {
  return (region || "").replace(/\s*(시|구|군|동|역).*/, "").trim() || region;
}

function unique(arr) {
  return [...new Set(arr.filter(Boolean))];
}

/** API 미연동 — 추정 검색량 생성 금지 */
export function fetchKeywordMetrics(_keyword) {
  return {
    status: "pending",
    monthlyVolume: null,
    volumeLabel: "검색량 데이터 미확인",
    competition: null,
    competitionLabel: "경쟁도 데이터 미확인",
    trendDirection: null,
    trendLabel: "트렌드 데이터 미확인",
    sources: ["naver_keyword_tool_pending", "datalab_pending", "google_trends_pending"],
  };
}

function trendDirectionForKeyword(keyword, snapshot) {
  if (!snapshot?.hasVerifiedData) return { direction: null, label: "트렌드 데이터 미확인" };
  const signals = [
    ...(snapshot.rawSignals || []),
    ...(snapshot.industries || []).flatMap((i) => i.risingThemes || []),
  ];
  const hit = signals.some((s) =>
    String(s).toLowerCase().includes(String(keyword).toLowerCase().slice(0, 4))
  );
  if (hit) return { direction: "up", label: "▲ 상승 (수집 트렌드 반영)" };
  return { direction: null, label: "트렌드 데이터 미확인" };
}

function discoverCandidates(input) {
  const region = sanitizeText(input.region);
  const brand = sanitizeText(input.brandName);
  const topic = sanitizeText(input.topic || input.mainKeyword);
  const stem = regionStem(region);
  const ind = resolveSimpleIndustry(input.industry || "flower");
  const label = ind.label || "매장";

  const mains = unique([
    topic,
    stem && label ? `${stem}${label}` : null,
    stem && topic ? `${stem}${topic}` : null,
    brand && stem ? `${stem} ${brand}` : null,
    brand,
  ]);

  const subs = unique([
    `${label} 추천`,
    `${stem} ${label}`,
    "기념일 선물",
    "당일 픽업",
    "후기",
    topic && `${topic} 추천`,
  ]).filter((k) => k && k.length > 2 && !mains.includes(k));

  const longtails = unique([
    stem && label ? `${stem} ${label} 추천` : null,
    stem && topic ? `${stem} ${topic} 후기` : null,
    brand && stem ? `${stem} ${brand} 위치` : null,
    stem ? `${stem} 근처 ${label}` : null,
  ]).filter((k) => k && k.length > 4);

  const season = getActiveSeasonContext(
    input.contentDate ? new Date(`${input.contentDate}T12:00:00`) : new Date()
  );
  const seasonKw = unique([
    season.event,
    ...(season.eventTags || []),
    `${season.label} ${label}`,
  ]).filter(Boolean);

  const regionKw = unique([stem, region, stem && `${stem}역`]).filter(Boolean);

  const brandKw = unique([brand, brand && `${brand} ${label}`]).filter(Boolean);

  return { mains, subs, longtails, seasonKw, regionKw, brandKw, industryLabel: label };
}

function scoreFit(keyword, input, kind) {
  const region = sanitizeText(input.region);
  const brand = sanitizeText(input.brandName);
  const topic = sanitizeText(input.topic || input.mainKeyword);
  const stem = regionStem(region);
  let regionFit = 2;
  let brandFit = 2;
  let seasonFit = 3;
  let intentFit = 3;

  if (stem && keyword.includes(stem)) regionFit = 5;
  if (region && keyword.includes(region.replace(/\s/g, ""))) regionFit = Math.max(regionFit, 4);
  if (brand && keyword.includes(brand.replace(/\s/g, ""))) brandFit = 5;
  if (topic && keyword.includes(topic.slice(0, Math.min(4, topic.length)))) intentFit = 5;

  const season = getActiveSeasonContext(
    input.contentDate ? new Date(`${input.contentDate}T12:00:00`) : new Date()
  );
  if (season.event && keyword.includes(season.event.replace(/\s/g, "").slice(0, 4))) {
    seasonFit = 5;
  }

  const weights =
    kind === "main"
      ? { region: 0.3, brand: 0.15, season: 0.2, intent: 0.35 }
      : kind === "longtail"
        ? { region: 0.35, brand: 0.1, season: 0.15, intent: 0.4 }
        : { region: 0.25, brand: 0.15, season: 0.25, intent: 0.35 };

  const composite = Math.round(
    regionFit * weights.region * 20 +
      brandFit * weights.brand * 20 +
      seasonFit * weights.season * 20 +
      intentFit * weights.intent * 20
  );

  return {
    searchVolumeStars: null,
    competitionStars: null,
    regionFit: STAR(regionFit),
    seasonFit: STAR(seasonFit),
    brandFit: STAR(brandFit),
    composite: Math.min(99, composite),
    reasons: buildReasons(keyword, input, { regionFit, brandFit, seasonFit, intentFit }),
  };
}

function buildReasons(keyword, input, fits) {
  const reasons = [];
  const stem = regionStem(input.region);
  if (fits.regionFit >= 4 && stem && keyword.includes(stem)) {
    reasons.push("지역 노출에 유리");
  }
  if (fits.seasonFit >= 4) reasons.push("시즌·시의성과 맞음");
  if (fits.intentFit >= 4) reasons.push("입력 주제·검색 의도와 연결");
  if (fits.brandFit >= 4 && input.brandName) reasons.push("브랜드명 검색 연계");
  if (!reasons.length) reasons.push("브랜드·지역·주제 조합 기반 후보");
  return reasons.slice(0, 3);
}

function enrichKeyword(keyword, input, kind, snapshot) {
  const metrics = fetchKeywordMetrics(keyword);
  const trend = trendDirectionForKeyword(keyword, snapshot);
  const fit = scoreFit(keyword, input, kind);
  return {
    keyword,
    kind,
    ...metrics,
    trendDirection: trend.direction,
    trendLabel: trend.label,
    ...fit,
    searchVolumeStars: metrics.monthlyVolume ? STAR(3) : null,
    competitionStars: metrics.competition ? STAR(3) : null,
  };
}

export function runKeywordIntelligence(input = {}) {
  const snapshot = typeof window !== "undefined" ? getCachedSnapshot() : null;
  const discovered = discoverCandidates(input);
  const mains = discovered.mains
    .slice(0, 5)
    .map((k) => enrichKeyword(k, input, "main", snapshot));
  const subs = discovered.subs
    .slice(0, 8)
    .map((k) => enrichKeyword(k, input, "sub", snapshot));
  const longtails = discovered.longtails
    .slice(0, 6)
    .map((k) => enrichKeyword(k, input, "longtail", snapshot));

  mains.sort((a, b) => b.composite - a.composite);
  const recommendedMain = mains[0]?.keyword || input.mainKeyword || "";
  const strategy =
    regionStem(input.region) && recommendedMain.includes(regionStem(input.region))
      ? "지역 키워드 중심"
      : "주제·브랜드 혼합";

  return {
    ok: Boolean(input.region?.trim() && (input.topic?.trim() || input.brandName?.trim())),
    dataVerified: Boolean(snapshot?.hasVerifiedData),
    apiStatus: "keyword_apis_pending",
    recommendedMain,
    strategy,
    strategyReason:
      strategy === "지역 키워드 중심"
        ? "지역명이 포함된 메인 키워드로 근거리 검색 노출에 유리합니다."
        : "입력 주제·브랜드 기준으로 후보를 구성했습니다. 검색량은 API 연동 후 표시됩니다.",
    mains,
    subs,
    longtails,
    season: discovered.seasonKw.map((k) => enrichKeyword(k, input, "season", snapshot)),
    region: discovered.regionKw.map((k) => enrichKeyword(k, input, "region", snapshot)),
    brand: discovered.brandKw.map((k) => enrichKeyword(k, input, "brand", snapshot)),
    weaveRules: {
      mainMin: 4,
      mainMax: 7,
      subMin: 1,
      subMax: 3,
      banPatterns: ["에서 찾는다면", "이 좋은", "으로 검색"],
    },
  };
}

export function keywordBriefForPrompt(report) {
  if (!report?.ok) return "";
  const lines = [
    `메인 키워드(권장): ${report.recommendedMain}`,
    `서브: ${report.subs.slice(0, 4).map((k) => k.keyword).join(", ")}`,
    `전략: ${report.strategy} — ${report.strategyReason || ""}`,
    "제목·도입·중간 소제목·결론에 분산 배치, 키워드 과삽입·기계적 반복 금지",
  ];
  return lines.join(" · ");
}
