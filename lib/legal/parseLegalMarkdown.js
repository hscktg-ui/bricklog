import { Fragment } from "react";

/**
 * Legal markdown → React nodes (headings, lists, paragraphs, links).
 * Intentionally minimal — no raw HTML, no dependency on react-markdown.
 */

function parseInline(text) {
  const parts = [];
  const re = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("**")) {
      parts.push({ type: "strong", text: token.slice(2, -2) });
    } else {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (linkMatch) {
        parts.push({ type: "link", label: linkMatch[1], href: linkMatch[2] });
      }
    }
    last = m.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function renderInline(text, keyPrefix) {
  const parts = parseInline(text);
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (typeof part === "string") return <Fragment key={key}>{part}</Fragment>;
    if (part.type === "strong") {
      return <strong key={key}>{part.text}</strong>;
    }
    if (part.type === "link") {
      const external = /^https?:\/\//i.test(part.href);
      return (
        <a
          key={key}
          href={part.href}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {part.label}
        </a>
      );
    }
    return null;
  });
}

function flushParagraph(buffer, target, keyRef) {
  const text = buffer.join(" ").trim();
  if (!text) return;
  keyRef.n += 1;
  target.push(
    <p key={`p-${keyRef.n}`}>{renderInline(text, `p-${keyRef.n}`)}</p>
  );
  buffer.length = 0;
}

function flushList(list, target, keyRef) {
  if (!list || list.items.length === 0) return;
  keyRef.n += 1;
  const Tag = list.ordered ? "ol" : "ul";
  target.push(
    <Tag key={`list-${keyRef.n}`}>
      {list.items.map((item, i) => (
        <li key={i}>{renderInline(item, `li-${keyRef.n}-${i}`)}</li>
      ))}
    </Tag>
  );
  list.items.length = 0;
}

function flushSection(sectionChildren, output, keyRef) {
  flushList(null, sectionChildren, keyRef);
  if (sectionChildren.length === 0) return;
  keyRef.n += 1;
  output.push(
    <section key={`sec-${keyRef.n}`}>{sectionChildren.splice(0)}</section>
  );
}

/**
 * @param {string} source
 * @returns {import('react').ReactNode[]}
 */
export function parseLegalMarkdown(source) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const output = [];
  const keyRef = { n: 0 };
  /** @type {import('react').ReactNode[]} */
  let sectionChildren = [];
  let paraBuffer = [];
  /** @type {{ ordered: boolean, items: string[] } | null} */
  let currentList = null;
  let preamble = [];

  const endSection = () => {
    flushList(currentList, sectionChildren, keyRef);
    currentList = null;
    flushParagraph(paraBuffer, sectionChildren, keyRef);
    flushSection(sectionChildren, output, keyRef);
    sectionChildren = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (trimmed.startsWith("## ")) {
      endSection();
      keyRef.n += 1;
      sectionChildren.push(
        <h2 key={`h2-${keyRef.n}`}>{trimmed.slice(3).trim()}</h2>
      );
      continue;
    }

    if (trimmed.startsWith("### ")) {
      flushList(currentList, sectionChildren, keyRef);
      currentList = null;
      flushParagraph(paraBuffer, sectionChildren, keyRef);
      keyRef.n += 1;
      sectionChildren.push(
        <h3 key={`h3-${keyRef.n}`}>{trimmed.slice(4).trim()}</h3>
      );
      continue;
    }

    const ulMatch = /^[-*]\s+(.+)$/.exec(trimmed);
    if (ulMatch) {
      flushParagraph(paraBuffer, sectionChildren, keyRef);
      if (!currentList || currentList.ordered) {
        flushList(currentList, sectionChildren, keyRef);
        currentList = { ordered: false, items: [] };
      }
      currentList.items.push(ulMatch[1]);
      continue;
    }

    const olMatch = /^(\d+)\.\s+(.+)$/.exec(trimmed);
    if (olMatch) {
      flushParagraph(paraBuffer, sectionChildren, keyRef);
      if (!currentList || !currentList.ordered) {
        flushList(currentList, sectionChildren, keyRef);
        currentList = { ordered: true, items: [] };
      }
      currentList.items.push(olMatch[2]);
      continue;
    }

    if (trimmed === "") {
      flushList(currentList, sectionChildren, keyRef);
      currentList = null;
      flushParagraph(paraBuffer, sectionChildren, keyRef);
      continue;
    }

    flushList(currentList, sectionChildren, keyRef);
    currentList = null;
    if (sectionChildren.length === 0 && output.length === 0) {
      preamble.push(trimmed);
    } else {
      paraBuffer.push(trimmed);
    }
  }

  endSection();

  if (preamble.length > 0) {
    const buf = [];
    flushParagraph(preamble, buf, keyRef);
    output.unshift(...buf);
  }

  return output;
}
