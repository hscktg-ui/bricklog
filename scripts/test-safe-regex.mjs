/**
 * RegExp 문자열 오염 시 .test 크래시 방지 회귀
 */
import { mergeRegexProfile, normalizeRegexList } from "../lib/utils/safeRegex.js";
import { scoreMagazineColumnArc, scoreToneBookends } from "../lib/content/columnMagazineArchetype.js";
import { scorePersonaEngineAlignment } from "../lib/persona/personaEngineProfile.js";

process.env.BRICLOG_MISSION = "true";

const corruptedLearned = {
  sampleCount: 100,
  voiceEndings: {
    haeyo: "(?:해요|했어요)$",
    hamnida: "(?:합니다|습니다)$",
    banmal: "(?:해\\.|했어\\.)$",
  },
  openerClosersBad: ["/안녕하세요/", "/감사합니다/"],
  arcMarkers: {
    gi: ["왜|고민"],
    seung: ["직접|다녀"],
    jeon: ["비교|기준"],
    gyeol: ["정리|마무리"],
  },
};

const defaults = {
  arcMarkers: {
    gi: [/왜/],
    seung: [/직접/],
    jeon: [/비교/],
    gyeol: [/정리/],
  },
  voiceEndings: {
    haeyo: /해요$/,
    hamnida: /합니다$/,
    banmal: /해\.$/,
  },
  openerClosersBad: [/안녕하세요/],
};

const merged = mergeRegexProfile(defaults, corruptedLearned);
if (!merged.voiceEndings.haeyo?.test) {
  console.error("FAIL: haeyo should be RegExp");
  process.exit(1);
}
normalizeRegexList(["/test/", /real/]).forEach((re) => {
  if (typeof re.test !== "function") {
    console.error("FAIL: normalizeRegexList");
    process.exit(1);
  }
});

const pack = {
  title: "파주 플레르퍼피 방문 후기",
  sections: [
    { heading: "왜 갔는지", body: "요즘 고민하다 직접 다녀왔어요." },
    { heading: "현장", body: "매장에서 구역을 확인했어요." },
    { heading: "비교", body: "비교해 보니 기준이 보였어요." },
    { heading: "인상", body: "분위기가 편했어요." },
  ],
  conclusion: "정리하면 직접 가 본 기준으로 도움이 됐어요.",
};

scoreMagazineColumnArc(pack);
scoreToneBookends(pack);

const input = {
  brandName: "플레르퍼피",
  region: "파주",
  topic: "애견카페 다녀왔어요",
  v4Speaker: "plain_review",
};
const persona = scorePersonaEngineAlignment(pack, input);
if (!persona || persona.score == null) {
  console.error("FAIL: persona alignment");
  process.exit(1);
}

console.log("OK safe-regex regression");
