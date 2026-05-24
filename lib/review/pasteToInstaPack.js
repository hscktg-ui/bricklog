/**
 * 붙여넣은 인스타 캡션 → 검수용 pack
 */

function parseHashtags(text) {
  const tags = [];
  const re = /#([\w가-힣]+)/g;
  let m;
  while ((m = re.exec(text))) {
    if (m[1]) tags.push(m[1]);
  }
  return [...new Set(tags)];
}

/**
 * @param {string} raw
 */
export function pastedTextToInstaPack(raw) {
  const text = String(raw || "").trim();
  if (!text) {
    return {
      hook: "",
      body: "",
      lineBreakBody: "",
      ending: "",
      hashtags: [],
    };
  }

  const lines = text.split("\n");
  const bodyLines = [];
  const tagLines = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      bodyLines.push("");
      continue;
    }
    if (/^(#[\w가-힣]+\s*)+$/.test(t)) {
      tagLines.push(t);
    } else {
      bodyLines.push(line);
    }
  }

  const captionBody = bodyLines.join("\n").trim();
  const tagText = tagLines.join(" ");
  const hashtags = parseHashtags(tagText || text);

  const nonEmpty = captionBody.split("\n").filter((l) => l.trim());
  const hook = nonEmpty[0]?.trim() || captionBody.slice(0, 80);
  const rest = nonEmpty.slice(1).join("\n").trim();
  const lineBreakBody = captionBody || text;

  return {
    hook,
    body: rest || captionBody,
    lineBreakBody,
    ending: "",
    hashtags,
  };
}
