/**
 * V14 — 반복 감지·완화 (3회+ 표현 변경, 5회+ 문단 제거)
 */
const REPHRASE_MAP = {
  "선택 기준": ["비교 포인트", "확인할 항목", "체크 포인트"],
  "브랜드 맥락": ["브랜드 안내", "매장 기준", "공식 안내"],
  일관성: ["동일 기준", "같은 조건", "안내 기준"],
  "운영 관점": ["이용 흐름", "방문·구매 절차", "실제 이용"],
  "판단 기준": ["비교 항목", "확인 사항", "체크리스트"],
  "실무 적용": ["실제 이용", "방문·구매", "현장 확인"],
  "콘텐츠 운영": ["매장·행사 안내", "프로모션 정보", "체험 안내"],
  "발행 직전": ["방문 전", "구매 전", "예약 전"],
};

const WATCH_PHRASES = Object.keys(REPHRASE_MAP);

function countPhrase(text, phrase) {
  const re = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  return (String(text || "").match(re) || []).length;
}

export function detectExcessiveRepetition(full, opts = {}) {
  const maxPhrase = opts.maxPhrase ?? 4;
  const maxParagraphDup = opts.maxParagraphDup ?? 5;
  const issues = [];

  for (const phrase of WATCH_PHRASES) {
    const n = countPhrase(full, phrase);
    if (n >= maxParagraphDup) {
      issues.push({ type: "phrase_remove", phrase, count: n });
    } else if (n >= maxPhrase) {
      issues.push({ type: "phrase_rephrase", phrase, count: n });
    }
  }

  const paragraphs = String(full || "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 60);
  const paraSeen = new Map();
  for (const p of paragraphs) {
    paraSeen.set(p, (paraSeen.get(p) || 0) + 1);
  }
  for (const [para, count] of paraSeen) {
    if (count >= maxParagraphDup) {
      issues.push({
        type: "duplicate_paragraph",
        sample: para.slice(0, 40),
        count,
      });
      break;
    }
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}

function rephraseText(text, phrase, slot = 0) {
  const alt = REPHRASE_MAP[phrase];
  if (!alt?.length) return text;
  const replacement = alt[slot % alt.length];
  const re = new RegExp(phrase, "gi");
  let count = 0;
  return String(text || "").replace(re, (m) => {
    count += 1;
    if (count <= 2) return m;
    return replacement;
  });
}

function stripParagraphsWithPhrase(text, phrase, keep = 2) {
  const blocks = String(text || "").split(/\n{2,}/);
  let hits = 0;
  const kept = [];
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    if (new RegExp(phrase, "i").test(trimmed)) {
      hits += 1;
      if (hits <= keep) kept.push(trimmed);
      continue;
    }
    kept.push(trimmed);
  }
  return kept.join("\n\n");
}

export function applyRepetitionControlToText(text, issues = []) {
  let out = String(text || "");
  for (const issue of issues) {
    if (issue.type === "phrase_remove") {
      out = stripParagraphsWithPhrase(out, issue.phrase, 1);
    } else if (issue.type === "phrase_rephrase") {
      out = rephraseText(out, issue.phrase, issue.count || 0);
    }
  }
  return out.trim();
}

function mapPackSections(pack, fn) {
  if (!pack?.sections?.length) return pack;
  return {
    ...pack,
    sections: pack.sections.map((s) => ({
      ...s,
      body: fn(s.body || "", s),
      heading: s.heading,
    })),
    conclusion: pack.conclusion ? fn(pack.conclusion, { heading: "conclusion" }) : pack.conclusion,
  };
}

/**
 * @param {object} pack
 * @param {string} [channel]
 */
export function applyRepetitionControl(pack, channel = "blog") {
  if (!pack || channel === "image") return pack;
  const full = [
    pack.title,
    ...(pack.sections || []).map((s) => `${s.heading}\n${s.body}`),
    pack.conclusion,
    pack.shortNotice,
    pack.detailBody,
    pack.hook,
    pack.body,
  ]
    .filter(Boolean)
    .join("\n");

  const detection = detectExcessiveRepetition(full);
  if (detection.ok) return pack;

  if (channel === "place") {
    return {
      ...pack,
      detailBody: applyRepetitionControlToText(pack.detailBody, detection.issues),
      shortNotice: applyRepetitionControlToText(pack.shortNotice, detection.issues),
    };
  }
  if (channel === "instagram") {
    return {
      ...pack,
      body: applyRepetitionControlToText(pack.body, detection.issues),
      lineBreakBody: applyRepetitionControlToText(pack.lineBreakBody, detection.issues),
    };
  }
  return mapPackSections(pack, (body) => applyRepetitionControlToText(body, detection.issues));
}
