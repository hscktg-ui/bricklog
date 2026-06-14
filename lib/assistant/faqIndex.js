/**
 * FAQ SSOT → 도움말 AI 규칙 매칭 + LLM 컨텍스트
 */
import { LANDING_FAQ_ITEMS } from "@/lib/landing/landingFaq";

function norm(text = "") {
  return String(text || "").trim().toLowerCase();
}

export function buildFaqKnowledgeBlock() {
  return LANDING_FAQ_ITEMS.map((item) => `Q: ${item.q}\nA: ${item.a}`).join(
    "\n\n"
  );
}

/**
 * @param {string} message
 */
export function matchFaqReply(message) {
  const t = norm(message);
  if (!t || t.length < 2) return null;

  let best = null;
  let bestScore = 0;

  for (const item of LANDING_FAQ_ITEMS) {
    let score = 0;
    for (const kw of item.keywords || []) {
      if (t.includes(norm(kw))) score += 2;
    }
    const qWords = item.q
      .replace(/[?？]/g, "")
      .split(/\s+/)
      .filter((w) => w.length >= 2);
    for (const w of qWords) {
      if (t.includes(norm(w))) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  if (!best || bestScore < 2) return null;

  return {
    reply: best.a,
    topic: best.id,
    faqId: best.id,
  };
}
