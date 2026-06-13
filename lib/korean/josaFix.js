/**
 * 브랜드명·매장명 뒤 조사 자동 교정 (받침 유무)
 */
function hasJongseong(word) {
  if (!word) return false;
  const code = word.charCodeAt(word.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

function pickJosa(word, pair) {
  const [withJong, withoutJong] = pair;
  return hasJongseong(word) ? withJong : withoutJong;
}

const BROKEN_JOSA_FIXES = [
  [/응대을/g, "응대를"],
  [/이용를/g, "이용을"],
  [/쇼룸를/g, "쇼룸을"],
  [/분위기·응대을/g, "분위기와 응대를"],
  [/위치·응대을/g, "위치와 응대를"],
  [/매장를/g, "매장을"],
];

export function fixBrokenCompoundJosa(text = "") {
  let out = String(text || "");
  for (const [re, rep] of BROKEN_JOSA_FIXES) {
    out = out.replace(re, rep);
  }
  return out;
}

const MAX_JOSA_BRAND_LEN = 48;
const MAX_JOSA_TEXT_LEN = 12_000;

export function fixBrandJosa(text, brandName) {
  if (!text || !brandName) return text;
  let out = String(text).slice(0, MAX_JOSA_TEXT_LEN);
  const b = String(brandName).trim().slice(0, MAX_JOSA_BRAND_LEN);
  if (!b || b.length < 2) return fixBrokenCompoundJosa(out);

  const fixes = [
    [new RegExp(`${escapeRe(b)}은(?!\\s)`, "g"), `${b}${pickJosa(b, ["은", "는"])}`],
    [new RegExp(`${escapeRe(b)}는(?!\\s)`, "g"), `${b}${pickJosa(b, ["은", "는"])}`],
    [new RegExp(`${escapeRe(b)}을(?!\\s)`, "g"), `${b}${pickJosa(b, ["을", "를"])}`],
    [new RegExp(`${escapeRe(b)}를(?!\\s)`, "g"), `${b}${pickJosa(b, ["을", "를"])}`],
    [new RegExp(`${escapeRe(b)}이(?!\\s)`, "g"), `${b}${pickJosa(b, ["이", "가"])}`],
    [new RegExp(`${escapeRe(b)}가(?!\\s)`, "g"), `${b}${pickJosa(b, ["이", "가"])}`],
    [/매장는/g, "매장은"],
    [/브랜드은/g, "브랜드는"],
  ];

  for (const [re, rep] of fixes) {
    out = out.replace(re, rep);
  }
  return fixBrokenCompoundJosa(out);
}

function escapeRe(s) {
  const raw = String(s || "").slice(0, MAX_JOSA_BRAND_LEN);
  if (!raw) return "";
  let out = "";
  for (const ch of raw) {
    if (/[.*+?^${}()|[\]\\]/.test(ch)) out += `\\${ch}`;
    else out += ch;
  }
  return out;
}
