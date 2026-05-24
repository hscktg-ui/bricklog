import { buildAllContent, buildBlogContent } from "@/utils/promptBuilder";
import {
  runBlogPipeline,
  runPlacePipeline,
  runInstagramPipeline,
  runImagePipeline,
  toGenerationRecord,
} from "@/lib/contentPipeline";

export {
  buildAllContent,
  createPromptContext,
  buildOpenAIPayload,
  buildBlogContent,
} from "@/utils/promptBuilder";
export {
  parseOpenAIJson,
  validateContentPack,
} from "@/lib/prompts/parseResponse";
export { stabilizeOpenAIResponse } from "@/lib/prompts/responseStabilizer";
export {
  runBlogPipeline,
  runPlacePipeline,
  runInstagramPipeline,
  runImagePipeline,
  toGenerationRecord,
  generatePlaceFromBlog,
  generateInstaFromBlog,
  generateImageFromBlog,
} from "@/lib/contentPipeline";

/** @deprecated generateBlogPipelineAsync (/api/content/blog) 사용 */
export async function generateBlog(formValues) {
  const { generateBlogPipelineAsync } = await import("@/lib/contentPipeline");
  const result = await generateBlogPipelineAsync(formValues);
  return {
    blog: result.blogContent,
    meta: result.meta,
    mode: result.mode,
  };
}

export function generateWithMeta(input) {
  const full = buildAllContent(input);
  const { _meta, _prompt, ...content } = full;
  return { content, meta: _meta, openai: _prompt };
}
