/**
 * BRICLOG Generation Pipeline V2 — Ultimate Engine 위임
 */
export {
  prepareUltimateBlogContext as prepareBlogPipelineV2,
} from "@/lib/ultimate/runUltimateEngine";

import { deriveTitleQuestion } from "./titleUnderstanding";
import { finalizeUltimateMeta } from "@/lib/ultimate/runUltimateEngine";

export function finalizePipelineMeta(pack, ctx, extra = {}) {
  const title = pack.representativeTitle || pack.title;
  const titleQuestion = deriveTitleQuestion(title, ctx);
  return finalizeUltimateMeta(pack, ctx, {
    ...extra,
    pipelineExtras: {
      titleQuestion,
      stepsCompleted: [
        ...(ctx.pipeline?.stepsCompleted || []),
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "11",
        "12",
        "audit",
      ],
    },
    passOutput: extra.passOutput,
  });
}
