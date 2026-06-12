/**
 * Editor V95 · contentGate · coverage 패딩 카탈로그 문장 차단 SSOT
 * GPT-5.5 원고 위에 덮어씌워지는 「상담이 빨라집니다」「선택 기준이 달라졌어요」류.
 */
import { splitKoreanSentences } from "@/lib/content/v2AxisSentencePrune";
import {
  CHECKLIST_TEMPLATE_RES,
  isChecklistInstructionSentence,
} from "@/lib/product/checklistVoiceEngine";
import { getChannelFullText } from "@/lib/content/channelPack";

/** briclogEditorEngineV95 · blogLengthControl · contentGateSystem 전형 */
export const EDITOR_V95_CATALOG_RES = [
  /상담이\s*빨라(?:집|졌)/,
  /직접\s*확인해\s*보니\s*생각보다\s*선택\s*기준이\s*달라졌/,
  /비교해\s*보니\s*가격보다\s*(?:방문|이용)\s*동선/,
  /(?:에서|매장에서)\s*확인한\s*기준이\s*명확(?:했|하)/,
  /확인한\s*기준이\s*명확(?:했|하)/,
  /선택지로\s*볼\s*때/,
  /[\u2013\u2014-]\s*확인\s*포인트/,
  /공간\s*설명(?:에서는)?.*?(?:배치|방문)\s*동선/,
  /수면\s*자세·체압\s*분산·배송·설치\s*일정/,
  /볼\s*때\s*짚을\s*점/,
  /선택이\s*수월(?:해|합니다|해요)?/,
  /좌판·등받이·팔걸이/,
  /종류·포장·픽업(?:\s*시간)?/,
  /성분·보관·선물\s*목적/,
  /함께\s*보면\s*선택이\s*수월/,
  /프랜차이즈\s*쇼룸\s*안내를\s*기준으로/,
  /매장\s*안내를\s*기준으로\s*확인/,
  /매장\s*문의로\s*확인/,
  /기준으로\s*비교해\s*봤/,
  /보러\s*갔을\s*때/,
  /생각보다\s*.+\s*만족도/,
  /조사해\s*둔/,
  /궁금한\s*점은\s*전화[·•]\s*방문/,
  /느낀\s*점은\s*기준이\s*명확/,
  /정리해\s*두면\s*선택이/,
  /비교(?:할|해)\s*때\s*막히는\s*지점/,
  /헷갈리는\s*포인트/,
];

const ALL_CATALOG_RES = [...EDITOR_V95_CATALOG_RES, ...CHECKLIST_TEMPLATE_RES];

export function detectCatalogContamination(text = "") {
  const s = String(text || "");
  return ALL_CATALOG_RES.some((re) => re.test(s));
}

export function isCatalogContaminationSentence(sentence = "") {
  const t = String(sentence || "").trim();
  if (!t || t.replace(/\s/g, "").length < 8) return false;
  if (isChecklistInstructionSentence(t)) return true;
  return EDITOR_V95_CATALOG_RES.some((re) => re.test(t));
}

export function stripCatalogContaminationSentences(text = "") {
  const kept = [];
  for (const raw of splitKoreanSentences(String(text || ""))) {
    const s = raw.trim();
    if (!s || s.length < 6) continue;
    if (isCatalogContaminationSentence(s)) continue;
    kept.push(s);
  }
  return kept.join("\n\n").trim();
}

export function stripCatalogContaminationHeading(heading = "") {
  let h = String(heading || "")
    .replace(/,\s*선택지로\s*볼\s*때/g, "")
    .replace(/\s*[\u2013\u2014-]\s*확인\s*포인트/g, "")
    .replace(/\s*볼\s*때\s*짚을\s*점\s*$/g, "")
    .trim();
  if (/^확인\s*포인트$/i.test(h)) return "";
  return h.replace(/\s{2,}/g, " ").trim();
}

export function stripCatalogContaminationFromBlogPack(pack) {
  if (!pack?.sections?.length) return pack;
  const strippedAll = (pack.sections || []).map((sec) => ({
    ...sec,
    heading: stripCatalogContaminationHeading(sec.heading),
    body: stripCatalogContaminationSentences(sec.body),
  }));
  const sections = strippedAll.filter(
    (sec) => String(sec.body || "").replace(/\s/g, "").length >= 16
  );

  return {
    ...pack,
    title: stripCatalogContaminationHeading(pack.title),
    intro: pack.intro ? stripCatalogContaminationSentences(pack.intro) : pack.intro,
    conclusion: pack.conclusion
      ? stripCatalogContaminationSentences(pack.conclusion)
      : pack.conclusion,
    sections: sections.length ? sections : strippedAll,
    _meta: {
      ...(pack._meta || {}),
      catalogContaminationStripped: true,
    },
  };
}

/**
 * @param {object} pack
 * @param {"place"|"instagram"|"blog"} channel
 */
export function stripCatalogContaminationFromChannelPack(pack, channel = "place") {
  if (!pack) return pack;
  if (channel === "place") {
    return {
      ...pack,
      title: stripCatalogContaminationHeading(pack.title),
      shortNotice: stripCatalogContaminationSentences(
        String(pack.shortNotice || "").replace(/\n+/g, " ")
      ),
      detailBody: stripCatalogContaminationSentences(pack.detailBody),
      _meta: {
        ...(pack._meta || {}),
        catalogContaminationStripped: true,
      },
    };
  }
  if (channel === "instagram") {
    const field = pack.lineBreakBody ? "lineBreakBody" : "body";
    return {
      ...pack,
      hook: stripCatalogContaminationSentences(pack.hook),
      [field]: stripCatalogContaminationSentences(pack[field]),
      ending: stripCatalogContaminationSentences(pack.ending),
      _meta: {
        ...(pack._meta || {}),
        catalogContaminationStripped: true,
      },
    };
  }
  return pack;
}

export function scoreCatalogContamination(fullText = "") {
  const text = String(fullText || "");
  let hits = 0;
  for (const re of EDITOR_V95_CATALOG_RES) {
    if (re.test(text)) hits += 1;
  }
  return { ok: hits === 0, hits, score: Math.max(0, 100 - hits * 18) };
}

export function assertNoCatalogContamination(pack, channel = "blog") {
  const full =
    channel === "blog"
      ? (pack?.sections || []).map((s) => `${s.heading}\n${s.body}`).join("\n")
      : getChannelFullText(pack, channel);
  return scoreCatalogContamination(full);
}
