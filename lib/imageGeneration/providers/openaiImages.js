/**
 * OpenAI Images (DALL·E 3 / gpt-image-1)
 * gpt-image-1은 response_format·dall-e 전용 size를 받지 않는다.
 */
const DALLE3_SIZE = {
  "1:1": "1024x1024",
  "16:9": "1792x1024",
  "4:5": "1024x1792",
  "9:16": "1024x1792",
  auto: "1792x1024",
};

const GPT_IMAGE_SIZE = {
  "1:1": "1024x1024",
  "16:9": "1536x1024",
  "4:5": "1024x1536",
  "9:16": "1024x1536",
  auto: "1536x1024",
};

export function isOpenAIImageConfigured() {
  const key = (process.env.OPENAI_API_KEY || "").trim();
  return key.length > 20 && !key.includes("your-");
}

function isGptImageModel(model) {
  return String(model || "").startsWith("gpt-image");
}

async function postImage(apiKey, body) {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

async function asDataUrl(b64, url) {
  if (b64) return `data:image/png;base64,${b64}`;
  if (!url) return "";
  const img = await fetch(url);
  if (!img.ok) return url;
  const bytes = Buffer.from(await img.arrayBuffer());
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

export async function generateOpenAIImage(prompt, { ratio = "16:9" } = {}) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY가 설정되지 않았습니다.");
  }

  const requested = process.env.OPENAI_IMAGE_MODEL?.trim() || "dall-e-3";
  const models = isGptImageModel(requested)
    ? [requested]
    : [requested, "gpt-image-1"];

  let lastError = "OpenAI Images 오류";
  for (const model of models) {
    const sizes = isGptImageModel(model) ? GPT_IMAGE_SIZE : DALLE3_SIZE;
    const body = {
      model,
      prompt: String(prompt || "").slice(0, 4000),
      n: 1,
      size: sizes[ratio] || sizes["1:1"],
    };
    if (!isGptImageModel(model)) {
      body.quality = "standard";
    }

    let { res, data } = await postImage(apiKey, body);
    const msg = data?.error?.message || "";
    if (!res.ok && /size/i.test(msg)) {
      body.size = "1024x1024";
      ({ res, data } = await postImage(apiKey, body));
    }
    if (!res.ok && /quality/i.test(data?.error?.message || "")) {
      delete body.quality;
      ({ res, data } = await postImage(apiKey, body));
    }
    if (!res.ok) {
      lastError = data?.error?.message || `OpenAI Images 오류 (${res.status})`;
      continue;
    }

    const item = data?.data?.[0] || {};
    const imageUrl = await asDataUrl(item.b64_json, item.url);
    if (!imageUrl) {
      lastError = "OpenAI에서 이미지 데이터를 받지 못했습니다.";
      continue;
    }
    return {
      imageUrl,
      provider: "openai",
      model,
      revisedPrompt: item.revised_prompt,
    };
  }

  throw new Error(lastError);
}
