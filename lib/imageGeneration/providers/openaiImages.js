/**
 * OpenAI Images (DALL·E 3 / gpt-image-1)
 */
const SIZE_MAP = {
  "1:1": "1024x1024",
  "16:9": "1792x1024",
  "4:5": "1024x1792",
  "9:16": "1024x1792",
  "auto": "1792x1024",
};

export function isOpenAIImageConfigured() {
  const key = (process.env.OPENAI_API_KEY || "").trim();
  return key.length > 20 && !key.includes("your-");
}

export async function generateOpenAIImage(prompt, { ratio = "16:9" } = {}) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY가 설정되지 않았습니다.");
  }

  const size = SIZE_MAP[ratio] || SIZE_MAP["16:9"];
  const model = process.env.OPENAI_IMAGE_MODEL?.trim() || "dall-e-3";

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt: prompt.slice(0, 4000),
      n: 1,
      size,
      response_format: "b64_json",
      quality: "standard",
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      data?.error?.message || `OpenAI Images 오류 (${res.status})`
    );
  }

  const b64 = data?.data?.[0]?.b64_json;
  const url = data?.data?.[0]?.url;
  if (b64) {
    return {
      imageUrl: `data:image/png;base64,${b64}`,
      provider: "openai",
      model,
      revisedPrompt: data?.data?.[0]?.revised_prompt,
    };
  }
  if (url) {
    return { imageUrl: url, provider: "openai", model };
  }
  throw new Error("OpenAI에서 이미지 데이터를 받지 못했습니다.");
}
