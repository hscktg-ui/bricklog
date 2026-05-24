/**
 * 붙여넣은 블로그 초안 → 검수용 pack
 */

function isLikelyHeading(line) {
  const t = line.trim();
  if (!t || t.length > 80) return false;
  if (/^#+\s/.test(t)) return true;
  if (/^\d+[\.\)]\s/.test(t)) return true;
  if (t.endsWith("?") || t.endsWith("!")) return t.length < 48;
  if (t.length < 36 && !/[.!?…]$/.test(t)) return true;
  return false;
}

/**
 * @param {string} raw
 */
export function pastedTextToBlogPack(raw) {
  const text = String(raw || "").trim();
  if (!text) {
    return {
      title: "",
      representativeTitle: "",
      sections: [],
      conclusion: "",
    };
  }

  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  if (!blocks.length) {
    return {
      title: "",
      representativeTitle: "",
      sections: [{ heading: "", body: text }],
      conclusion: "",
    };
  }

  let title = blocks[0];
  let bodyBlocks = blocks.slice(1);
  if (blocks[0].length > 120 || !isLikelyHeading(blocks[0])) {
    title = blocks[0].split("\n")[0].slice(0, 80);
    bodyBlocks = blocks;
  }

  const sections = [];
  let current = null;

  for (const block of bodyBlocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    const first = lines[0] || "";
    const rest = lines.slice(1).join("\n").trim();

    if (lines.length === 1 && isLikelyHeading(first)) {
      if (current) sections.push(current);
      current = { heading: first.replace(/^#+\s*/, ""), body: "" };
      continue;
    }

    if (lines.length >= 2 && isLikelyHeading(first) && rest) {
      if (current) sections.push(current);
      sections.push({ heading: first.replace(/^#+\s*/, ""), body: rest });
      current = null;
      continue;
    }

    if (!current) current = { heading: "", body: block };
    else current.body = `${current.body}\n\n${block}`;
  }
  if (current) sections.push(current);

  if (!sections.length) {
    sections.push({ heading: "", body: bodyBlocks.join("\n\n") || text });
  }

  const last = sections[sections.length - 1];
  let conclusion = "";
  if (last?.body && /(마무리|정리|방문|문의|연락)/.test(last.heading || "")) {
    conclusion = last.body;
    sections.pop();
  }

  return {
    title,
    representativeTitle: title,
    sections,
    conclusion,
  };
}
