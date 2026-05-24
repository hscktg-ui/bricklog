/**
 * Nano Banana API — https://nano-banana-api.readme.io
 * env: NANO_BANANA_API_KEY, NANO_BANANA_BASE_URL (optional)
 */
const SIZE_MAP = {
  "1:1": "1024x1024",
  "16:9": "1792x1024",
  "4:5": "1024x1792",
};

export function isNanoBananaConfigured() {
  const key = (process.env.NANO_BANANA_API_KEY || "").trim();
  return key.length > 8;
}

export async function generateNanoBananaImage(prompt, { ratio = "16:9" } = {}) {
  const apiKey = process.env.NANO_BANANA_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("NANO_BANANA_API_KEY가 설정되지 않았습니다.");
  }

  const base =
    process.env.NANO_BANANA_BASE_URL?.trim() ||
    "https://api.nanobananaapi.com";
  const size = SIZE_MAP[ratio] || "1024x1024";
  const model = process.env.NANO_BANANA_MODEL?.trim() || "nano-banana";

  const res = await fetch(`${base}/v1/images/generations`, {
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
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      data?.error?.message ||
        data?.message ||
        `Nano Banana API 오류 (${res.status})`
    );
  }

  const item = data?.data?.[0] || data?.images?.[0] || data;
  const b64 = item?.b64_json || item?.base64;
  const url = item?.url || data?.url;
  if (b64) {
    return {
      imageUrl: `data:image/png;base64,${b64}`,
      provider: "nanobanana",
      model,
    };
  }
  if (url) {
    return { imageUrl: url, provider: "nanobanana", model };
  }
  throw new Error("Nano Banana에서 이미지 데이터를 받지 못했습니다.");
}
