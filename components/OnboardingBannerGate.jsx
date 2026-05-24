"use client";

import OnboardingBanner from "@/components/OnboardingBanner";
import { useContentPipelineState } from "@/context/ContentContext";

export default function OnboardingBannerGate({ activeMenu }) {
  const { hasBlog } = useContentPipelineState();
  return (
    <OnboardingBanner visible={activeMenu === "blog" && !hasBlog} />
  );
}
