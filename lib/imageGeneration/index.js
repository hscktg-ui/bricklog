import {
  generateOpenAIImage,
  isOpenAIImageConfigured,
} from "./providers/openaiImages";
import {
  generateNanoBananaImage,
  isNanoBananaConfigured,
} from "./providers/nanoBananaImages";

export function getImageProviderStatus() {
  return {
    openai: isOpenAIImageConfigured(),
    nanobanana: isNanoBananaConfigured(),
    any: isOpenAIImageConfigured() || isNanoBananaConfigured(),
  };
}

/**
 * @param {'openai'|'nanobanana'|'auto'} provider
 */
export async function generateChannelImage(prompt, options = {}) {
  const { provider = "auto", ratio = "16:9" } = options;
  const p = prompt?.trim();
  if (!p) throw new Error("이미지 프롬프트가 비어 있습니다.");

  const tryOpenAI = async () => generateOpenAIImage(p, { ratio });
  const tryNano = async () => generateNanoBananaImage(p, { ratio });

  if (provider === "openai") return tryOpenAI();
  if (provider === "nanobanana") return tryNano();

  if (isOpenAIImageConfigured()) {
    try {
      return await tryOpenAI();
    } catch (e) {
      if (isNanoBananaConfigured()) return tryNano();
      throw e;
    }
  }
  if (isNanoBananaConfigured()) return tryNano();

  throw new Error(
    ".env.local에 OPENAI_API_KEY 또는 NANO_BANANA_API_KEY를 설정해 주세요."
  );
}
