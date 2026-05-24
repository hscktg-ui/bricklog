/**
 * OPENAI_API_KEY 있으면 확장 검수 (현재 rule-based 폴백)
 */
export async function tryOpenAIReview(channel, text, ctx) {
  const key =
    typeof process !== "undefined" ? process.env.OPENAI_API_KEY : null;
  if (!key) return null;

  try {
    const res = await fetch("/api/editor/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel, text: text.slice(0, 6000), ctx }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
