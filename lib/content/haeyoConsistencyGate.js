/**
 * 해요체 일관 — 블로그 본문 합니다/습니다 혼용 제거 (GPT 티 완화)
 */
import { splitKoreanSentences } from "@/lib/content/v2AxisSentencePrune";

const HAMNI_END_RE =
  /(?:습니다|됩니다|있습니다|없습니다|합니다|드립니다|바랍니다|제공합니다|가능합니다|필요합니다|좋습니다|중요합니다|되었습니다|했습니다)(?:\.|!|…)?\s*$/;

const HAMNI_TO_HAEYO = [
  [/제공합니다\.?/g, "제공해요."],
  [/가능합니다\.?/g, "가능해요."],
  [/필요합니다\.?/g, "필요해요."],
  [/좋습니다\.?/g, "좋았어요."],
  [/중요합니다\.?/g, "중요해요."],
  [/됩니다\.?/g, "돼요."],
  [/있습니다\.?/g, "있어요."],
  [/없습니다\.?/g, "없어요."],
  [/드립니다\.?/g, "드려요."],
  [/바랍니다\.?/g, "바라요."],
  [/하였습니다\.?/g, "했어요."],
  [/했습니다\.?/g, "했어요."],
  [/되었습니다\.?/g, "됐어요."],
  [/였었다\.?/g, "었어요."],
  [/했었다\.?/g, "했어요."],
  [/생겼었다\.?/g, "생겼어요."],
  [/돌아봤었다\.?/g, "돌아봤어요."],
  [/갔었다\.?/g, "갔어요."],
  [/봤었다\.?/g, "봤어요."],
  [/확인했다\.?/g, "확인했어요."],
  [/들었다\.?/g, "들었어요."],
  [/보았다\.?/g, "봤어요."],
  [/메모했다\.?/g, "메모했어요."],
  [/전달했다\.?/g, "전달했어요."],
  [/물어봤었다\.?/g, "물어봤어요."],
  [/정리됐었다\.?/g, "정리됐어요."],
  [/알아봤었다\.?/g, "알아봤어요."],
  [/검토했다\.?/g, "검토했어요."],
  [/비교했다\.?/g, "비교했어요."],
  [/정리해\s*봤다\.?/g, "정리해 봤어요."],
  [/달라졌었다\.?/g, "달라졌어요."],
  [/빨라졌었다\.?/g, "빨라졌어요."],
  [/도움이\s*됐다\.?/g, "도움이 됐어요."],
  [/\.이다\.?$/g, "이에요."],
  [/반이다\.?/g, "반이에요."],
  [/습니다\.?/g, "어요."],
  [/합니다\.?/g, "해요."],
];

/** 인용구·해시태그 줄은 그대로 */
function shouldSkipHaeyoLine(line) {
  const t = String(line || "").trim();
  if (!t) return true;
  if (/^#/.test(t)) return true;
  if (/^>/.test(t)) return true;
  return false;
}

export function normalizeHaeyoSpeech(text = "") {
  let t = String(text || "");
  if (!t.trim()) return t;

  const lines = t.split("\n");
  const out = lines.map((line) => {
    if (shouldSkipHaeyoLine(line)) return line;
    let next = line;
    for (const [re, rep] of HAMNI_TO_HAEYO) {
      next = next.replace(re, rep);
    }
    return next;
  });

  t = out.join("\n");

  const paras = t.split(/\n\n+/);
  const fixedParas = paras.map((para) => {
    const sents = splitKoreanSentences(para);
    if (!sents.length) return para;
    return sents
      .map((s) => {
        let x = s.trim();
        if (!x || shouldSkipHaeyoLine(x)) return x;
        for (const [re, rep] of HAMNI_TO_HAEYO) {
          x = x.replace(re, rep);
        }
        if (HAMNI_END_RE.test(x) && !/(?:해요|예요|이에요|거예요|네요|죠)\s*[.!?…]?\s*$/.test(x)) {
          x = x.replace(HAMNI_END_RE, (m) => {
            const stem = m.replace(/(?:습니다|합니다|됩니다|있습니다|드립니다|바랍니다|제공합니다|가능합니다|필요합니다|좋습니다|중요합니다|되었습니다|했습니다)(?:\.|!|…)?\s*$/, "");
            return `${stem}어요.`;
          });
        }
        return x;
      })
      .filter(Boolean)
      .join(" ");
  });

  return fixedParas.join("\n\n").trim();
}

export function applyHaeyoConsistencyToPack(pack) {
  if (!pack?.sections?.length) return pack;
  const sections = pack.sections.map((sec) => ({
    ...sec,
    body: normalizeHaeyoSpeech(sec.body),
  }));
  let conclusion = String(pack.conclusion || "").trim();
  if (conclusion) conclusion = normalizeHaeyoSpeech(conclusion);
  return {
    ...pack,
    sections,
    conclusion,
    _meta: {
      ...(pack._meta || {}),
      haeyoConsistencyGate: true,
    },
  };
}

/**
 * @param {object} pack
 * @param {"place"|"instagram"} channel
 */
export function applyHaeyoConsistencyToChannelPack(pack, channel) {
  if (!pack) return pack;
  if (channel === "place") {
    return {
      ...pack,
      title: normalizeHaeyoSpeech(pack.title),
      shortNotice: normalizeHaeyoSpeech(pack.shortNotice),
      detailBody: normalizeHaeyoSpeech(pack.detailBody),
      _meta: { ...(pack._meta || {}), haeyoConsistencyGate: true },
    };
  }
  if (channel === "instagram") {
    const bodyField = pack.lineBreakBody ? "lineBreakBody" : "body";
    return {
      ...pack,
      hook: normalizeHaeyoSpeech(pack.hook),
      [bodyField]: normalizeHaeyoSpeech(pack[bodyField]),
      ending: normalizeHaeyoSpeech(pack.ending),
      _meta: { ...(pack._meta || {}), haeyoConsistencyGate: true },
    };
  }
  return pack;
}
