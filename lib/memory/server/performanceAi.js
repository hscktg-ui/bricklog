import { callOpenAIAssistant } from "@/lib/llm/assistantChat";
import { isOpenAIConfigured } from "@/lib/llm/llmProvider";

export async function buildPerformanceFeedback(payload) {
  const {
    reaction = "",
    memo = "",
    title = "",
    channel = "blog",
    patterns = [],
  } = payload;

  if (!isOpenAIConfigured()) {
    const lines = [];
    if (reaction === "good") lines.push("반응이 좋았던 요소를 다음 글 도입·제목에도 유지해 보세요.");
    if (reaction === "bad") lines.push("과장 표현을 줄이고 구체 장면 위주로 써 보세요.");
    if (patterns.length) lines.push(`잘 통했던 패턴: ${patterns.join(", ")}`);
    return {
      aiFeedback: lines.join(" ") || "기록해 주셔서 감사합니다. 다음 글에 반영해 보겠습니다.",
      patterns: patterns.slice(0, 5),
    };
  }

  try {
    const raw = await callOpenAIAssistant(
      [
        {
          role: "system",
          content:
            'JSON만: {"ai_feedback":"3문장","patterns":["패턴1",...]}. 다음 글 제안. 한국어.',
        },
        {
          role: "user",
          content: `채널:${channel} 제목:${title} 반응:${reaction} 메모:${memo} 기존패턴:${patterns.join(",")}`,
        },
      ],
      { maxTokens: 400, temperature: 0.4 }
    );
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    return {
      aiFeedback: String(parsed.ai_feedback || parsed.aiFeedback || "").slice(0, 600),
      patterns: (parsed.patterns || []).slice(0, 5),
    };
  } catch {
    return {
      aiFeedback: "성과 기록을 반영해 다음 글 톤을 조정하겠습니다.",
      patterns,
    };
  }
}
