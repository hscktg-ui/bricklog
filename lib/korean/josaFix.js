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

export function fixBrandJosa(text, brandName) {
  if (!text || !brandName) return text;
  let out = text;
  const b = brandName.trim();

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
  return out;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
