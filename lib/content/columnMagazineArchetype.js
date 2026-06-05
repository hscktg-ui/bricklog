/**
 * 칼럼·매거진형 기승전결 + 톤 앤드(시작↔끝) 일관성 — 100건 표본 학습 프로필 기반
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { splitKoreanSentences } from "@/lib/content/v2AxisSentencePrune";
import { deriveTopicWritingContext } from "@/lib/content/topicFacetEngine";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import learnedColumnMagazineProfile from "@/artifacts/column-magazine-learning/profile-latest.json" with { type: "json" };

export const MAGAZINE_ARC_VERSION = "v1";
export const MAGAZINE_ARC_PASS = 72;
export const TONE_BOOKEND_PASS = 70;

const DEFAULT_PROFILE = {
  version: MAGAZINE_ARC_VERSION,
  sampleCount: 0,
  source: "default",
  arcRoles: ["기", "승", "승", "전", "전", "결"],
  arcMarkers: {
    gi: [
      /왜\s*(?:이|그|요즘|지금)/,
      /(?:고민|궁금|찾(?:게|다)|검색)/,
      /(?:상황|배경|처음|요즘)/,
      /솔직히/,
      /(?:많아서|헷갈|고르)/,
    ],
    seung: [
      /직접\s*(?:가|방문|다녀|먹|체험|누워|확인)/,
      /(?:다녀(?:왔|온)|가\s*봤|들러)/,
      /(?:느(?:꼈|낀)|체감|체험)/,
      /(?:매장|쇼룸|현장)/,
      /(?:10분|누워|먹어\s*보)/,
    ],
    jeon: [
      /(?:비교|기준|포인트|막히)/,
      /(?:장단|아쉬|달랐|차이)/,
      /(?:선택|판단|고를\s*때)/,
      /(?:확인|짚|메모)/,
    ],
    gyeol: [
      /(?:정리|마무리|한\s*번\s*더|다시)/,
      /(?:추천|아쉬|다음에|재방)/,
      /(?:본인\s*기준|직접\s*가\s*보)/,
      /(?:도움이|수월|편했)/,
    ],
  },
  transitions: [
    "그래서 직접 가 봤어요.",
    "현장에서 보니 감이 달랐어요.",
    "비교해 보니 기준이 보였어요.",
    "정리하면 이렇게 짚을 수 있었어요.",
  ],
  voiceEndings: {
    haeyo: /(?:해요|했어요|더라고요|거든요|네요|죠|같아요|편했어요|좋았어요|나았어요)$/,
    hamnida: /(?:합니다|습니다|드립니다|겠습니다|였습니다)$/,
    banmal: /(?:해\.|했어\.|더라\.|같아\.)$/,
  },
  openerClosersBad: [
    /안녕하세요/,
    /여기서\s*마무리/,
    /감사합니다/,
    /도움이\s*되(?:었|시)/,
    /종합(?:적)?으로/,
  ],
};

let cachedProfile = null;

function splitSentences(text) {
  return splitKoreanSentences(text);
}

export function loadColumnMagazineProfile() {
  if (cachedProfile) return cachedProfile;
  if (learnedColumnMagazineProfile && learnedColumnMagazineProfile.sampleCount) {
    cachedProfile = { ...DEFAULT_PROFILE, ...learnedColumnMagazineProfile };
    return cachedProfile;
  }
  cachedProfile = DEFAULT_PROFILE;
  return cachedProfile;
}

function markerHit(text, markers) {
  const list = Array.isArray(markers)
    ? markers.map((m) => (m instanceof RegExp ? m : new RegExp(m)))
    : [];
  return list.some((re) => re.test(String(text || "")));
}

function detectVoiceEndingStyle(text) {
  const profile = loadColumnMagazineProfile();
  const sentences = splitSentences(text).slice(-4);
  let haeyo = 0;
  let hamnida = 0;
  let banmal = 0;
  for (const s of sentences) {
    const t = s.trim();
    if (profile.voiceEndings.haeyo.test(t)) haeyo += 1;
    else if (profile.voiceEndings.hamnida.test(t)) hamnida += 1;
    else if (profile.voiceEndings.banmal.test(t)) banmal += 1;
  }
  const total = haeyo + hamnida + banmal || 1;
  return {
    dominant:
      haeyo >= hamnida && haeyo >= banmal
        ? "haeyo"
        : hamnida >= banmal
          ? "hamnida"
          : banmal > 0
            ? "banmal"
            : "neutral",
    haeyo: haeyo / total,
    hamnida: hamnida / total,
    banmal: banmal / total,
  };
}

/** 시작(도입)·끝(결론) 톤 일치 — 매거진 칼럼은 시종 해요체·방문 서사 */
export function scoreToneBookends(pack) {
  const sections = pack?.sections || [];
  if (!sections.length) {
    return { ok: false, score: 30, reasons: ["empty_pack"] };
  }

  const opener = String(sections[0]?.body || "").slice(0, 420);
  const closer = String(pack?.conclusion || sections[sections.length - 1]?.body || "").slice(-420);
  const profile = loadColumnMagazineProfile();

  const openVoice = detectVoiceEndingStyle(opener);
  const closeVoice = detectVoiceEndingStyle(closer);
  const reasons = [];
  let score = 100;

  if (openVoice.dominant !== closeVoice.dominant && closeVoice.dominant !== "neutral") {
    reasons.push("opener_closer_voice_mismatch");
    score -= 28;
  }
  if (openVoice.dominant === "hamnida" || closeVoice.dominant === "hamnida") {
    reasons.push("formal_hamnida_breaks_column");
    score -= 18;
  }
  for (const re of profile.openerClosersBad) {
    if (re.test(opener) || re.test(closer)) {
      reasons.push("blog_template_bookend");
      score -= 12;
      break;
    }
  }

  const openField = /(?:직접|다녀|솔직|가\s*봤|체험|방문)/.test(opener);
  const closeReflect = /(?:정리|직접|기준|한\s*번|다시|도움)/.test(closer);
  if (!openField) {
    reasons.push("weak_opener_field");
    score -= 10;
  }
  if (!closeReflect) {
    reasons.push("weak_closer_reflect");
    score -= 10;
  }

  return {
    ok: score >= TONE_BOOKEND_PASS,
    score: Math.max(0, score),
    reasons,
    openVoice: openVoice.dominant,
    closeVoice: closeVoice.dominant,
  };
}

/** 기·승·전·결 — 섹션 역할 + 전환·마무리 */
export function scoreMagazineColumnArc(pack) {
  const sections = pack?.sections || [];
  if (sections.length < 4) {
    return { ok: false, score: 35, reasons: ["sections_thin"], gi: false, seung: false, jeon: false, gyeol: false };
  }

  const profile = loadColumnMagazineProfile();
  const full = getBlogFullText(pack);
  const reasons = [];
  let score = 100;

  const bodies = sections.map((s) => String(s.body || ""));
  const gi = markerHit(bodies[0], profile.arcMarkers.gi) || markerHit(full.slice(0, 280), profile.arcMarkers.gi);
  const seung =
    bodies.slice(1, Math.min(4, bodies.length)).some((b) => markerHit(b, profile.arcMarkers.seung)) ||
    markerHit(full, profile.arcMarkers.seung);
  const jeon =
    bodies.slice(Math.max(0, bodies.length - 3), bodies.length - 1).some((b) => markerHit(b, profile.arcMarkers.jeon)) ||
    markerHit(full, profile.arcMarkers.jeon);
  const gyeol =
    markerHit(pack?.conclusion || bodies[bodies.length - 1], profile.arcMarkers.gyeol) &&
    String(pack?.conclusion || "").trim().length >= 28;

  if (!gi) {
    reasons.push("missing_gi");
    score -= 18;
  }
  if (!seung) {
    reasons.push("missing_seung");
    score -= 18;
  }
  if (!jeon) {
    reasons.push("missing_jeon");
    score -= 16;
  }
  if (!gyeol) {
    reasons.push("missing_gyeol");
    score -= 20;
  }

  const flatList = /^(?:확인|참고|점검)하세요|FAQ|체크리스트/i.test(full);
  if (flatList) {
    reasons.push("flat_list_not_column");
    score -= 22;
  }

  const bookends = scoreToneBookends(pack);
  if (!bookends.ok) {
    reasons.push(...bookends.reasons.filter((r) => !reasons.includes(r)));
    score -= Math.max(0, 100 - bookends.score) * 0.35;
  }

  return {
    ok: score >= MAGAZINE_ARC_PASS,
    score: Math.max(0, Math.round(score)),
    reasons,
    gi,
    seung,
    jeon,
    gyeol,
    bookends,
  };
}

export function buildMagazineArcPromptBlock(input = {}) {
  if (!isBriclogMissionEnforced()) return "";
  const p = deriveTopicWritingContext(input);
  const profile = loadColumnMagazineProfile();
  const sampleNote =
    profile.sampleCount >= 50
      ? `(${profile.sampleCount}건 고품질 블로그·후기·칼럼 표본 학습)`
      : "(기본 칼럼·매거진 서사 규칙)";

  const subject = String(input.topic || input.mainKeyword || p.topicFacet || "").trim().split(/[,，]/)[0]?.trim() || p.topicFacet;
  return `【칼럼·매거진형 서사 ${sampleNote}】
- 주제 「${subject}」에서 벗어난 일반론·홍보·타 업종 예시 금지. 기승전결 각 구간이 이 주제·${p.brand} 방문 이야기와 직접 연결되어야 한다.
- 기(왜 찾게 됐는지·상황) → 승(직접 가본 현장·체험) → 전(비교·기준·아쉬운 점) → 결(본인 기준 정리) 순서를 지킨다. 소제목도 주제·방문 장면이 보이게 쓴다.
- 시작과 끝의 말투·온도는 같아야 한다. 도입이 「~했어요」면 마무리도 같은 해요체·방문 서사로 닫는다.
- 섹션마다 역할이 달라야 한다. 같은 문단·같은 조건 나열을 섹션 간 반복하지 않는다.
- 「알려드립니다」「소개합니다」「많은 분들께」「지금 바로」「도움이 되길」「안녕하세요」「종합적으로」 금지 — 광고·AI 템플릿 톤 금지.
- ${p.brand}${p.regionBit ? ` ${p.region}` : ""} ${p.topicFacet} — 독자가 끝까지 읽으면 「한 사람이 처음부터 끝까지 쓴 칼럼」처럼 느껴야 한다.`;
}

function normalizeHaeyoEnding(sentence) {
  let s = String(sentence || "").trim();
  if (!s) return s;
  if (/합니다\.?$|습니다\.?$|드립니다\.?$/.test(s)) {
    s = s
      .replace(/합니다\.?$/, "했어요.")
      .replace(/습니다\.?$/, "었어요.")
      .replace(/드립니다\.?$/, "드려요.");
  }
  if (!/[.!?。]$/.test(s)) s += ".";
  return s;
}

function pickArcTransition(profile, idx) {
  const weak = /이야기를\s*이어|(?:근데|사실)\s*[^가-힣]*$/;
  const list = (profile.transitions || DEFAULT_PROFILE.transitions).filter(
    (t) => !weak.test(String(t || "").trim())
  );
  const safe = list.length ? list : DEFAULT_PROFILE.transitions;
  return safe[idx % safe.length];
}

/** 결론·섹션 전환을 칼럼형으로 가볍게 보정 */
export function applyMagazineArcPolish(pack, input = {}) {
  if (!pack?.sections?.length) return pack;
  if (pack._meta?.magazineArcPolish) return pack;
  const profile = loadColumnMagazineProfile();
  const p = deriveTopicWritingContext(input);
  const sections = [...(pack.sections || [])];

  const openerBody = String(sections[0]?.body || "");
  const openVoice = detectVoiceEndingStyle(openerBody);
  const targetVoice = openVoice.dominant === "hamnida" ? "haeyo" : openVoice.dominant;

  let conclusion = String(pack.conclusion || "").trim();
  if (!conclusion || conclusion.replace(/\s/g, "").length < 24) {
    conclusion = `${p.regionBit}${p.brand} ${p.topicFacet} — 직접 가 본 뒤 본인 기준으로 정리해 봤어요. ${p.regionBit}방문 전 일정·주차만 확인해 두면 당일 동선도 편했어요.`;
  }
  if (targetVoice === "haeyo") {
    conclusion = splitSentences(conclusion)
      .map(normalizeHaeyoEnding)
      .join("\n\n");
  }

  const arcPolished = sections.map((sec, i) => {
    let body = String(sec.body || "").trim();
    const needsBridge = i === 1 || i === 3;
    if (needsBridge && body && !/(그래서|직접|비교|정리)/.test(body.slice(0, 40))) {
      const bridge = pickArcTransition(profile, i - 1);
      if (!body.includes(bridge.slice(0, 8))) {
        body = `${bridge}\n\n${body}`;
      }
    }
    return { ...sec, body };
  });

  const polished = { ...pack, sections: arcPolished, conclusion };
  const arcScore = scoreMagazineColumnArc(polished);

  return {
    ...polished,
    _meta: {
      ...(pack._meta || {}),
      magazineArcPolish: true,
      magazineArc: arcScore,
    },
  };
}

export function detectMagazineArcIssues(pack, input = {}) {
  const arc = scoreMagazineColumnArc(pack);
  const bookends = scoreToneBookends(pack);
  const issues = [];
  if (!arc.ok) issues.push({ type: "magazine_arc_weak", reasons: arc.reasons });
  if (!bookends.ok) issues.push({ type: "tone_bookend_mismatch", reasons: bookends.reasons });
  return { ok: issues.length === 0, issues, arc, bookends };
}
