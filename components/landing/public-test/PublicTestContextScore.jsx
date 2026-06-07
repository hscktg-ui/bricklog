"use client";

import BriclogDepthPanel from "@/components/quality/BriclogDepthPanel";

export default function PublicTestContextScore({ contextScore }) {
  return <BriclogDepthPanel contextScore={contextScore} variant="full" />;
}
