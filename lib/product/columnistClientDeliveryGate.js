/**
 * 클라이언트 송출 — API withhold·송출법 위반 시 rescue·역전 금지
 */
import { assertColumnistDeliveryLaw } from "@/lib/product/columnistDeliveryLaw";
import { hasEngineSpamInPack } from "@/lib/product/columnistEngineSpam";
import { hasUsableResearchFacts } from "@/lib/content/researchGroundedHumanPack";
import { assessGenerationAxisAlignment } from "@/lib/product/generationAxisAlignGate";

/**
 * API withheld·스팸·송출법 실패 팩을 UI에 올리면 true
 */
export function shouldBlockClientBlogPromotion(result = {}, input = {}, pack = null) {
  const blog = pack || result?.blogContent;

  if (result?.withheld || result?.meta?.columnistDeliveryLawBlocked) {
    return true;
  }

  const axis = assessGenerationAxisAlignment(input);
  if (!axis.ok) return true;

  if (!blog?.sections?.length) return false;

  if (blog._meta?.columnistDeliveryLawBlocked || blog._meta?.outputWithheld) {
    return true;
  }

  if (hasUsableResearchFacts(input) && hasEngineSpamInPack(blog)) {
    return true;
  }

  const law = assertColumnistDeliveryLaw(blog, input);
  return law.shouldWithhold;
}
