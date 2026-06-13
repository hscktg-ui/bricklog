/**
 * 경험형 블로그 말투 — 네이버 검색 API 표본 학습 프로필 (사람 후기·칼럼형)
 * 하드코딩 예문이 아니라 artifacts/experience-voice-learning/profile-latest.json 기반
 */
import { deriveTopicWritingContext, isInformationalTopicInput } from "@/lib/content/topicFacetEngine";
import { polishNaverBlogVoice } from "@/lib/channel/naverBlogEngineRules";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import learnedExperienceProfile from "@/artifacts/experience-voice-learning/profile-latest.json" with { type: "json" };
import { lineViolatesHomeRegion } from "@/lib/content/regionVoiceLock";
import { isDisplayBodyForbidden } from "@/lib/content/displayBodyGuards";

export const EXPERIENCE_VOICE_VERSION = "v2";
export const EXPERIENCE_VOICE_PASS = 68;

/** 학습·점수용 — 사람 후기에서 자주 보이는 신호 */
export const EXPERIENCE_VOICE_MARKERS = [
  /(?:갔|왔)는데/,
  /그렇더라(?:구|고)요/,
  /그랬더라(?:구|고)요/,
  /그래서\s*(?:너무\s*)?(?:좋|괜찮|만족|다행)/,
  /(?:다행이에요|다행히|다행)/,
  /미리\s*.+?(?:걸|할\s*걸|둘\s*걸)/,
  /(?:고민|걱정)(?:했|하)(?:는데|던데)/,
  /(?:솔직히|사실|근데)\s*/,
  /(?:처음엔|처음에는)\s*.+?(?:했는데|인데)/,
  /(?:생각보다|예상보다)/,
  /(?:직접\s*(?:가|다녀|방문|체험|누워)|다녀(?:왔|온))/,
  /(?:그랬습니다|그랬어요)/,
  /(?:느꼈|체감|누워\s*보)/,
];

const ROLE_ORDER = ["arrival", "emotion", "worry", "relief", "reflection", "punch"];

const DEFAULT_PROFILE = {
  version: EXPERIENCE_VOICE_VERSION,
  sampleCount: 0,
  source: "default",
  rates: { experienceRate: 0, fieldRate: 0, haeyoRate: 0 },
  roleBuckets: {
    arrival: [],
    emotion: [],
    worry: [],
    relief: [],
    reflection: [],
  },
  learnedExamples: [],
  patternCounts: {},
  promptExamples: [],
};

let cachedProfile = null;

function clean(text) {
  return polishNaverBlogVoice(String(text || "").trim());
}

export function loadExperienceVoiceProfile(force = false) {
  if (cachedProfile && !force) return cachedProfile;
  let base = { ...DEFAULT_PROFILE };
  if (learnedExperienceProfile && learnedExperienceProfile.sampleCount) {
    base = { ...DEFAULT_PROFILE, ...learnedExperienceProfile };
  }
  cachedProfile = base;
  return cachedProfile;
}

function getExperienceVoiceMarkers(profile) {
  const NETIZEN_EXTRA_MARKERS = [
    /(?:솔직히\s*말하면|개인적으로|해보니까?|가보니까?)/,
    /(?:생각보다|의외로|인\s*듯)/,
  ];
  if (profile?.voiceMarkerHints?.length) {
    return [...EXPERIENCE_VOICE_MARKERS, ...NETIZEN_EXTRA_MARKERS];
  }
  return EXPERIENCE_VOICE_MARKERS;
}

export function scoreExperienceVoice(fullText) {
  const text = String(fullText || "");
  const profile = loadExperienceVoiceProfile();
  const markers = getExperienceVoiceMarkers(profile);
  let hits = 0;
  const matched = [];
  for (const re of markers) {
    if (re.test(text)) {
      hits += 1;
      matched.push(String(re.source).slice(0, 28));
    }
  }
  const targetHits = profile.sampleCount >= 50 ? 3 : 2;
  const score = Math.min(100, 36 + hits * 9);
  return { ok: hits >= targetHits, score, hits, matched };
}

/** @deprecated — scoreExperienceVoice 와 동일 SSOT */
export function scoreConversationalHumanVoice(fullText) {
  return scoreExperienceVoice(fullText);
}

function isExhibitionTopic(input = {}) {
  return /전시|오픈|런칭|소식|오피모|신제품|프로모/.test(
    `${input.topic || ""} ${input.mainKeyword || ""}`
  );
}

function resolveIndustryCategory(input = {}) {
  const ind = String(input.industry || input.industryText || "");
  if (/가구|침대|매트리스|쇼룸|소파|침구/.test(ind)) return "가구점";
  if (/카페|디저트/.test(ind)) return "카페";
  if (/음식|맛집|식당/.test(ind)) return "음식점";
  if (/병원|의원|치과/.test(ind)) return "병원";
  if (/약국/.test(ind)) return "약국";
  if (/미용|헤어|네일/.test(ind)) return "미용실";
  if (/학원|교육/.test(ind)) return "학원";
  if (/헬스|피트니스/.test(ind)) return "헬스장";
  return null;
}

const CROSS_CATEGORY_BLOCK = {
  가구점: /(?:카페|맛집|디저트|약국|병원|헬스장|꽃집|펜션|피시방|학원|횟집|커피|온라인\s*쇼핑몰|의류|장어|핏이)/,
  카페: /(?:침대|매트리스|가구점|병원|약국)/,
  음식점: /(?:침대|매트리스|가구점|약국)/,
};

function lineMatchesIndustry(line, input = {}) {
  const category = resolveIndustryCategory(input);
  if (!category) return true;
  const block = CROSS_CATEGORY_BLOCK[category];
  if (!block) return true;
  const hasIndustryCue = /(?:가구|쇼룸|침대|매트리스|매장|전시|체험|소파)/.test(line);
  if (block.test(line) && !hasIndustryCue) return false;
  return true;
}

function hashPick(seed, list) {
  if (!list?.length) return null;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i) * (i + 1)) % 997;
  return list[h % list.length];
}

/** 학습 버킷·패턴 기반 맥락형 fallback (고정 예시 5종만 쓰지 않음) */
function buildContextualExperienceLine(role, p, input = {}) {
  const profile = loadExperienceVoiceProfile();
  const seed = `${input.brandName}|${input.region}|${input.topic}|${role}`;
  const category = resolveIndustryCategory(input);
  const bucket = (profile.roleBuckets?.[role] || [])
    .filter((item) => !category || item.category === category)
    .map((item) => (typeof item === "string" ? item : item?.line))
    .filter(Boolean)
    .filter((line) => !lineViolatesHomeRegion(line, input));
  const fromLearned = hashPick(seed, bucket);
  if (fromLearned) {
    const adapted = adaptLearnedLine(fromLearned, p, input);
    if (adapted && !isDisplayBodyForbidden(adapted, input)) return adapted;
  }

  if (isInformationalTopicInput(input)) {
    return null;
  }

  const exhibition = isExhibitionTopic(input);
  const subject = input.topic || p.topicRaw || p.topicFacet;
  const exhibitBit = /오피모/i.test(subject) ? "오피모" : p.topicFacet;
  const pc = profile.patternCounts || {};
  const worry =
    exhibition
      ? `${exhibitBit} 전시가 끝나기 전에 갈 수 있을지`
      : `${p.brand} ${p.topicFacet} 일정·견적`;
  const relief =
    exhibition ? `평일 오전에 예약해 둘걸` : `미리 전화로 일정 맞춰 둘걸`;

  const templates = {
    arrival: [
      clean(`${p.regionBit}${p.brand} 다녀왔는데, 생각보다 괜찮더라구요.`),
      clean(`솔직히 말하면 ${p.regionBit}${p.brand} 가보니까 괜찮았어요.`),
      pc.try_and_see
        ? clean(`${p.brand} ${p.topicFacet} 해보니까 감이 왔어요.`)
        : clean(`${p.regionBit}직접 가봤는데, 의외로 만족했어요.`),
    ],
    emotion: [
      clean(`그래서 ${exhibition ? `${exhibitBit} 보러 간` : "방문"} 선택은 괜찮았어요.`),
      clean(`개인적으로는 ${p.brand} 쪽이 마음에 들었어요.`),
      clean(`진짜 ${exhibition ? "전시 구성" : "체험"}이 생각보다 괜찮더라구요.`),
    ],
    worry: [
      clean(`${worry} 고민했는데, 직접 가보니 달랐어요.`),
      clean(`처음엔 ${p.topicFacet} 헷갈렸는데, 매장에서 보니 감이 왔어요.`),
    ],
    relief: [
      clean(`정말 ${relief}... 다행이에요!`),
      clean(`미리 확인해 둔 덕에 당일이 편했어요.`),
    ],
    reflection: [
          clean(`솔직히 ${p.brand} ${p.topicFacet}는 매장에서 본 구성이 검색과 달랐어요.`),
          clean(`${p.regionBit}${p.brand} ${exhibitBit} 보러 갔을 때 체험 순서가 정리됐어요.`),
          pc.in_deut ? clean(`전체적으로는 참고할 만한 편인 듯해요.`) : null,
        ],
    punch: [
      clean(`요즘 기준으로는 나쁘지 않았어요.`),
      clean(`한번 더 가볼 것 같아요.`),
    ],
  };

  const pool = (templates[role] || [])
    .filter(Boolean)
    .filter((line) => !isDisplayBodyForbidden(line, input));
  return hashPick(`${seed}|fb`, pool);
}

function isUsableLearnedLine(line, input = {}) {
  const s = String(line || "").trim();
  if (s.length < 14 || s.length > 96) return false;
  if (/#[^\s]+|https?:\/\//.test(s)) return false;
  if (/확인하세요|권합니다|소개해\s*드|체크리스트/.test(s)) return false;
  if (/사이즈는\s*솔직히|막막했는데,\s*기준만\s*정리|온라인\s*쇼핑몰/.test(s)) return false;
  if (lineViolatesHomeRegion(s, input)) return false;
  const industry = String(input.industry || "");
  if (/가구|침대|매트리스|쇼룸/.test(industry)) {
    if (/^(?:맛집|카페\s*추천|디저트\s*맛)/.test(s) && !/매장|체험|쇼룸/.test(s)) return false;
  }
  return /(?:어요|습니다|더라|는데|거든|죠)[.!?]?$/.test(s);
}

function adaptLearnedLine(line, p, input = {}) {
  if (!isUsableLearnedLine(line, input)) return null;
  if (!lineMatchesIndustry(line, input)) return null;
  let s = clean(line);
  s = s.replace(/^[「『"\[]+|[」』"\]]+$/g, "").trim();
  if (s.length < 14) return null;
  if (isDisplayBodyForbidden(s, input)) return null;
  return s;
}

function pickFromRoleBucket(profile, role, p, input) {
  const category = resolveIndustryCategory(input);
  const bucket = (profile.roleBuckets?.[role] || []).filter((item) => {
    if (!category) return false;
    return item.category === category;
  });

  for (const item of bucket) {
    const raw = typeof item === "string" ? item : item?.line || item?.phrase;
    const adapted = adaptLearnedLine(raw, p, input);
    if (adapted) return adapted;
  }
  return buildContextualExperienceLine(role, p, input);
}

/** 생성·주입용 — 학습 표본 우선, 맥락 fallback */
export function buildExperienceVoiceLines(p, input = {}) {
  const profile = loadExperienceVoiceProfile();
  const used = new Set();
  const lines = [];

  for (const role of ROLE_ORDER) {
    let line = pickFromRoleBucket(profile, role, p, input);
    if (line && isDisplayBodyForbidden(line, input)) line = null;
    if (!line) continue;
    const key = String(line || "")
      .replace(/\s/g, "")
      .slice(0, 40);
    if (used.has(key)) continue;
    used.add(key);
    lines.push(line);
  }

  return lines.slice(0, 5);
}

export function buildExperienceVoicePromptBlock() {
  if (!isBriclogMissionEnforced()) return "";
  const profile = loadExperienceVoiceProfile();
  const examples = (profile.promptExamples || profile.learnedExamples || []).slice(0, 8);
  const n = profile.sampleCount || 0;
  const netizenN = profile.netizenSampleCount || 0;
  const hints = (profile.voiceMarkerHints || []).slice(0, 6);

  const blocks = [];

  if (examples.length >= 3) {
    blocks.push(
      [
        "【경험형 블로그 · 온라인 표본 학습】",
        `네이버 후기 ${n}건${netizenN ? ` + 네티즌·스레드·커뮤니티 ${netizenN}건` : ""} — 정보 나열(X), 직접 경험담(O).`,
        hints.length ? `자주 보이는 톤: ${hints.join(", ")}` : "",
        "실제 상위글 말투 예 (참고만, 그대로 복사 금지):",
        ...examples.map((ex) => `- "${String(ex).slice(0, 88)}${ex.length > 88 ? "…" : ""}"`),
        "구어·감정·고민→결과 3~5회. 솔직히/개인적으로/해보니까/생각보다/더라구요 등 온라인 평균 톤. 과장·CTA·체크리스트·ㅋㅋ 남발 금지.",
      ].join("\n")
    );
  } else {
    blocks.push(
      `【경험형 블로그 · 사람 후기】
정보 나열이 아니라 경험담. 솔직히 말하면·해보니까·생각보다·더라구요·고민했는데→직접 확인 등 구어 3~5회.`
    );
  }

  if (profile.netizenPromptBlock) {
    blocks.push(profile.netizenPromptBlock);
  }

  return blocks.filter(Boolean).join("\n\n");
}

/** @deprecated */
export function buildConversationalVoicePromptBlock() {
  return buildExperienceVoicePromptBlock();
}

export { buildExperienceVoiceLines as buildConversationalLines };
