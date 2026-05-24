"use client";

import BriclogAssistant from "@/components/assistant/BriclogAssistant";
import { useContentPipelineState } from "@/context/ContentContext";

export default function BriclogAssistantHost({ suppress = false }) {
  const { blogContent, loadingOverlay } = useContentPipelineState();
  return (
    <BriclogAssistant
      hasBlog={!!blogContent}
      hidden={suppress || Boolean(loadingOverlay?.active)}
    />
  );
}
