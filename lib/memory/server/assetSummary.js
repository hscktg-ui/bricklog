import { callOpenAIAssistant } from "@/lib/llm/assistantChat";
import { isOpenAIConfigured } from "@/lib/llm/llmProvider";

export async function summarizeBrandAsset(text, brandName = "") {
  const trimmed = String(text || "").trim().slice(0, 12000);
  if (!trimmed) {
    return { summary: "", keyPoints: [] };
  }

  if (!isOpenAIConfigured()) {
    const lines = trimmed.split(/\n+/).filter((l) => l.trim().length > 8);
    return {
      summary: lines.slice(0, 2).join(" ").slice(0, 280),
      keyPoints: lines.slice(0, 5).map((l) => l.trim().slice(0, 120)),
    };
  }

  try {
    const raw = await callOpenAIAssistant(
      [
        {
          role: "system",
          content:
            "브랜드 자료 요약기. JSON만: {\"summary\":\"2문장\",\"key_points\":[\"...\",...]}. 원문 문장 복사 금지. 한국어.",
        },
        {
          role: "user",
          content: `브랜드: ${brandName || "(미입력)"}\n\n자료:\n${trimmed.slice(0, 6000)}`,
        },
      ],
      { maxTokens: 500, temperature: 0.3 }
    );
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    return {
      summary: String(parsed.summary || "").slice(0, 500),
      keyPoints: (parsed.key_points || parsed.keyPoints || []).slice(0, 8),
    };
  } catch {
    const lines = trimmed.split(/\n+/).filter((l) => l.trim().length > 8);
    return {
      summary: lines.slice(0, 2).join(" ").slice(0, 280),
      keyPoints: lines.slice(0, 5).map((l) => l.trim().slice(0, 120)),
    };
  }
}
